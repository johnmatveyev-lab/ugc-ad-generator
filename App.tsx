import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MainGenerator } from './components/MainGenerator';
import { Dashboard } from './components/Dashboard';
import { ProjectEditor } from './components/ProjectEditor';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { AuthModal } from './components/AuthModal';
import { UpgradeModal } from './components/UpgradeModal';
import * as authService from './services/authService';
import * as storageService from './services/storageService';
import * as geminiService from './services/geminiService';
import type { User, Project, TranscriptMessage } from './types';
import { LiveServerMessage } from '@google/genai';
import { soundService } from './services/soundService';

type View = 'generator' | 'dashboard' | 'editor' | 'studio';

// This is the new root component that handles all state and navigation.
const AppContainer: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [view, setView] = useState<View>('generator');
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const { addToast } = useToast();

    const loadProjects = useCallback(() => {
        const projs = storageService.getProjects();
        setProjects(projs);
    }, []);

    useEffect(() => {
        // Theme setup
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            setIsDarkMode(true);
        } else {
            document.documentElement.classList.remove('dark');
            setIsDarkMode(false);
        }

        // Auth and initial view setup
        const user = authService.getCurrentUser();
        if (user) {
            handleLoginSuccess(user);
        } else {
            setView('generator');
        }
        loadProjects();
    }, [loadProjects]);

    const handleToggleTheme = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        setIsDarkMode(!isDarkMode);
    };

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setShowAuthModal(false);
        setView('dashboard');
        addToast(`Welcome back, ${user.name}!`, 'success');
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        setView('generator');
        addToast('You have been logged out.', 'info');
    };
    
    const handleGenerationStart = () => {
        if (currentUser && !currentUser.isPremium && currentUser.usageCount >= 5) {
            setShowUpgradeModal(true);
            return false; // Prevent generation
        }
        return true; // Allow generation
    };
    
    const handleGenerationComplete = () => {
        if (currentUser && !currentUser.isPremium) {
            const updatedUser = authService.incrementUsage(currentUser.email);
            if (updatedUser) {
                setCurrentUser(updatedUser);
                const remaining = 5 - updatedUser.usageCount;
                if (remaining > 0) {
                    addToast(`You have ${remaining} free generation${remaining > 1 ? 's' : ''} left.`, 'info');
                } else {
                    addToast('You have used all your free generations. Upgrade to continue!', 'info');
                }
            }
        }
        loadProjects(); // Refresh project list
    };

    const handleUpgradeSuccess = () => {
        if (currentUser) {
            const updatedUser = authService.upgradeToPremium(currentUser.email);
            if (updatedUser) {
                setCurrentUser(updatedUser);
                setShowUpgradeModal(false);
                addToast('Welcome to Pro! You have unlimited generations.', 'success');
            }
        }
    };
    
    const handleOpenProject = (projectId: string) => {
        setActiveProjectId(projectId);
        setView('editor');
    }

    // --- Dashboard Voice Control ---
    const [isDashboardListening, setIsDashboardListening] = useState(false);
    const liveSessionPromiseRef = React.useRef<any>(null);
    const mediaStreamRef = React.useRef<MediaStream | null>(null);
    const audioContextRef = React.useRef<AudioContext | null>(null);
    const scriptProcessorRef = React.useRef<ScriptProcessorNode | null>(null);

    const handleToggleDashboardVoiceControl = () => {
        if (isDashboardListening) {
            stopDashboardListener();
        } else {
            startDashboardListener();
        }
    };

    const startDashboardListener = async () => {
        setIsDashboardListening(true);
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            liveSessionPromiseRef.current = geminiService.startDashboardConversation({
                onopen: () => {
                    if (!audioContextRef.current || !mediaStreamRef.current) return;
                    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                    scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = geminiService.createPcmBlob(inputData);
                        liveSessionPromiseRef.current?.then((session: any) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(audioContextRef.current.destination);
                },
                onmessage: handleDashboardLiveMessage,
                onerror: (e) => {
                    console.error('Dashboard session error:', e);
                    addToast('Voice control error.', 'error');
                    stopDashboardListener();
                },
                onclose: () => console.log('Dashboard session closed.'),
            });

        } catch (err) {
            addToast('Could not start microphone.', 'error');
            stopDashboardListener();
        }
    };

    const stopDashboardListener = () => {
        setIsDashboardListening(false);
        liveSessionPromiseRef.current?.then((session: any) => session.close());
        liveSessionPromiseRef.current = null;
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
    };

    const handleDashboardLiveMessage = async (message: LiveServerMessage) => {
        if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
                let result = "OK.";
                if (fc.name === 'openProject' && fc.args.projectName) {
                    const name = (fc.args.projectName as string).toLowerCase();
                    const project = projects.find(p => p.name.toLowerCase().includes(name));
                    if (project) {
                        handleOpenProject(project.id);
                        result = `Opening project ${project.name}.`;
                    } else {
                        result = `Sorry, I couldn't find a project named ${fc.args.projectName}.`;
                    }
                } else if (fc.name === 'deleteProject' && fc.args.projectName) {
                    const name = (fc.args.projectName as string).toLowerCase();
                    const project = projects.find(p => p.name.toLowerCase().includes(name));
                    if (project) {
                        storageService.deleteProject(project.id);
                        loadProjects();
                        result = `Deleted project ${project.name}.`;
                    } else {
                        result = `Sorry, I couldn't find a project named ${fc.args.projectName}.`;
                    }
                } else if (fc.name === 'startNewAd') {
                    setView('generator');
                    result = 'Navigating to the ad generator.';
                }
                
                liveSessionPromiseRef.current?.then((session: any) => {
                    session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } });
                });
            }
        }
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard projects={projects} onOpenProject={handleOpenProject} onNewProject={() => setView('generator')} />;
            case 'editor':
                return activeProjectId ? <ProjectEditor projectId={activeProjectId} onBack={() => setView('dashboard')} onSave={loadProjects} /> : <div/>;
            case 'generator':
            default:
                return <MainGenerator onGenerationStart={handleGenerationStart} onGenerationComplete={handleGenerationComplete} />;
        }
    };

    return (
        <div className="min-h-screen font-sans transition-colors duration-300 bg-transparent text-gray-900 dark:text-white">
            <Header
                user={currentUser}
                onToggleTheme={handleToggleTheme}
                isDarkMode={isDarkMode}
                onNavigateHome={() => currentUser ? setView('dashboard') : setView('generator')}
                onSignIn={() => setShowAuthModal(true)}
                onSignOut={handleLogout}
                showDashboardVoiceControl={view === 'dashboard'}
                onToggleDashboardVoiceControl={handleToggleDashboardVoiceControl}
                isDashboardListening={isDashboardListening}
            />
            <main>
                <div className="relative p-4 sm:p-6 lg:p-8">
                    {renderView()}
                </div>
            </main>
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLoginSuccess={handleLoginSuccess} />}
            {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgradeSuccess} />}
        </div>
    );
};

const App: React.FC = () => (
    <ToastProvider>
        <AppContainer />
    </ToastProvider>
);

export default App;