import React, { useState, useEffect, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import * as storageService from '../services/storageService';
import { saveVideo } from '../services/db';
import type { Project, GeneratedAssets, AllAssetsTextResult, TranscriptMessage } from '../types';
import { useToast } from '../contexts/ToastContext';
import { soundService } from '../services/soundService';
import { ResultsDisplay } from './ResultsDisplay';
import { LiveServerMessage } from '@google/genai';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { Loader } from './Loader';

type LiveSessionPromise = ReturnType<typeof geminiService.startConversation>;

const roles = [
    'AI Creative Director',
    'AI Video Editor',
    'AI Copywriter',
    'AI Designer',
    'AI Strategist',
    'AI Brand Consultant',
    'AI Content Creator',
    'AI Tiktok Specialist',
    'AI Virality Expert',
    'AI Genius',
];

interface MainGeneratorProps {
    onGenerationStart: () => boolean; // Returns true if allowed to proceed
    onGenerationComplete: () => void;
}

export const MainGenerator: React.FC<MainGeneratorProps> = ({ onGenerationStart, onGenerationComplete }) => {
    const [phase, setPhase] = useState<'idle' | 'conversing' | 'processing' | 'results'>('idle');
    const [progressMessage, setProgressMessage] = useState('');
    const [generatedAssets, setGeneratedAssets] = useState<GeneratedAssets | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasVeoApiKey, setHasVeoApiKey] = useState(false);
    const { addToast } = useToast();

    // -- Conversation State --
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const [isListening, setIsListening] = useState(false);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const liveSessionPromiseRef = useRef<LiveSessionPromise | null>(null);
    const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTime = useRef(0);
    let currentInputTranscription = '';
    let currentOutputTranscription = '';

    const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentRoleIndex((prev) => (prev + 1) % roles.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setHasVeoApiKey(hasKey);
            } else {
                // If the aistudio helper isn't available, assume API_KEY is in env and proceed.
                setHasVeoApiKey(true);
            }
        };
        checkKey();
        return () => {
            // Cleanup on unmount
            handleStopConversation();
        };
    }, []);

    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcript]);

    const handleApiKeySelect = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            // Re-check after user interaction. Assume success to mitigate race condition.
            setHasVeoApiKey(true);
            return true;
        }
        addToast('API key selection is not available.', 'error');
        return false;
    };
    
    const handleStartConversation = async () => {
        soundService.click();
        
        // Check usage limits via parent
        const canProceed = onGenerationStart();
        if (!canProceed) return;

        if (!hasVeoApiKey) {
            const keySelected = await handleApiKeySelect();
            if (!keySelected) {
                addToast('A Veo-enabled API key is required to start.', 'info');
                return;
            }
        }

        setIsListening(true);
        setTranscript([]);
        setPhase('conversing');
        
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            liveSessionPromiseRef.current = geminiService.startConversation({
                onopen: () => {
                    if (!audioContextRef.current || !mediaStreamRef.current) return;
                    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                    scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = geminiService.createPcmBlob(inputData);
                        liveSessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
        
                    source.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(audioContextRef.current.destination);
                },
                onmessage: handleLiveMessage,
                onerror: (e) => {
                    console.error('Live session error:', e);
                    addToast('Conversation error. Please try again.', 'error');
                    handleStopConversation();
                },
                onclose: (e) => console.log('Live session closed.'),
            });

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Could not start microphone.';
            addToast(message, 'error');
            handleStopConversation();
        }
    };

    const handleStopConversation = () => {
        setIsListening(false);

        liveSessionPromiseRef.current?.then(session => session.close());
        liveSessionPromiseRef.current = null;
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        audioContextRef.current = null;
    
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        outputAudioContextRef.current = null;
    };
    
    const handleLiveMessage = async (message: LiveServerMessage) => {
        // Handle transcription
        if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            currentInputTranscription += text;
            setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'user' && !last.isFinal) {
                    return [...prev.slice(0, -1), { ...last, text: currentInputTranscription }];
                }
                return [...prev, { speaker: 'user', text: currentInputTranscription }];
            });
        }
        if (message.serverContent?.outputTranscription) {
             const text = message.serverContent.outputTranscription.text;
            currentOutputTranscription += text;
            setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'ai' && !last.isFinal) {
                    return [...prev.slice(0, -1), { ...last, text: currentOutputTranscription }];
                }
                return [...prev, { speaker: 'ai', text: currentOutputTranscription }];
            });
        }
        if (message.serverContent?.turnComplete) {
            setTranscript(prev => prev.map(t => ({...t, isFinal: true})));
            currentInputTranscription = '';
            currentOutputTranscription = '';
        }

        // Handle audio output
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            nextStartTime.current = Math.max(nextStartTime.current, outputAudioContextRef.current.currentTime);
            const source = await geminiService.playAudio(base64Audio, outputAudioContextRef.current);
            audioSources.current.add(source);
            source.addEventListener('ended', () => {
                audioSources.current.delete(source);
            });
            source.start(nextStartTime.current);
            nextStartTime.current += source.buffer?.duration || 0;
        }

        // Handle interruptions
        if (message.serverContent?.interrupted) {
            audioSources.current.forEach(source => source.stop());
            audioSources.current.clear();
            nextStartTime.current = 0;
        }
        
        // Handle function call
        if (message.toolCall) {
            const fc = message.toolCall.functionCalls[0];
            if (fc.name === 'generateUGCAd' && fc.args.concept) {
                handleStopConversation();
                await handleGenerate(fc.args.concept as string);
            }
        }
    };


    const handleGenerate = async (concept: string) => {
        setPhase('processing');
        setGeneratedAssets(null);
        setError(null);
        setProgressMessage('✨ Waking up the AI creative director...');

        try {
            const textAssets: AllAssetsTextResult = await geminiService.generateAllAssetsFromText(concept);
            
            setProgressMessage('🎙️ Recording voiceover...');
            const voiceoverPromise = geminiService.generateSpeechAudioUrl(
                textAssets.transcript,
                'Say in an energetic and enthusiastic tone, suitable for a fast-paced commercial ad:'
            );

            setProgressMessage('🖼️ Designing thumbnail...');
            const thumbnailPromise = geminiService.generateImageWithImagen(textAssets.imagenPrompt);
            
            setProgressMessage('🎬 Generating video... (this can take a few minutes)');
            const videoPromise = geminiService.generateVideoWithVeo(
                textAssets.soraPrompt, 
                'veo-3.1-fast-generate-preview', 
                (msg) => setProgressMessage(`🎬 ${msg}`)
            );
            
            const [audioUrl, thumbnailB64, videoResult] = await Promise.all([voiceoverPromise, thumbnailPromise, videoPromise]);
            
            setProgressMessage('🎉 Finalizing...');
            
            const finalAssets: GeneratedAssets = {
                videoUrl: videoResult.url,
                audioUrl,
                thumbnailUrl: `data:image/jpeg;base64,${thumbnailB64}`,
                thumbnailB64: thumbnailB64,
                script: textAssets.soraPrompt,
                projectName: textAssets.projectName,
                transcript: textAssets.transcript,
                analysis: textAssets.viralityAnalysis,
                viralityScore: textAssets.viralityScore,
                veoVideoObject: videoResult.veoVideoObject,
            };
            
            setGeneratedAssets(finalAssets);
            setPhase('results');
            soundService.success();
            
            const projectId = crypto.randomUUID();
            const newProject: Project = {
                id: projectId,
                name: textAssets.projectName,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                thumbnail: thumbnailB64,
                prompts: {
                    soraPrompt: { description: textAssets.soraPrompt, style: 'cinematic', cinematography: '9:16 vertical video', lighting: 'natural light', mood: 'neutral', aspectRatio: '9:16 vertical video' },
                    imagenPrompt: textAssets.imagenPrompt,
                    transcript: textAssets.transcript,
                    viralityAnalysis: textAssets.viralityAnalysis,
                    viralityScore: textAssets.viralityScore,
                    suggestedRemix: '', transcriptContinuation: '', sunoPrompt: '',
                },
                previousScenes: [], nextScenes: [],
                video: { key: `veo-main-${projectId}`, veoVideoObject: videoResult.veoVideoObject, },
                voiceover: { url: audioUrl, transcript: textAssets.transcript, }
            };
            await saveVideo(newProject.video!.key, videoResult.file);
            storageService.saveProject(newProject);
            onGenerationComplete();

        } catch (e) {
            const message = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(message);
            addToast(message, 'error');
            setPhase('idle');
            soundService.error();
            if (message.includes("Requested entity was not found")) {
                if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                    setHasVeoApiKey(false);
                }
            }
        }
    };

    const resetState = () => {
        soundService.click();
        if (generatedAssets) {
            URL.revokeObjectURL(generatedAssets.videoUrl);
            URL.revokeObjectURL(generatedAssets.audioUrl);
        }
        setPhase('idle');
        setProgressMessage('');
        setGeneratedAssets(null);
        setError(null);
        setTranscript([]);
    };
    
    if (phase === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
                <Loader message={progressMessage} />
            </div>
        );
    }

    if (phase === 'results' && generatedAssets) {
        return <ResultsDisplay assets={generatedAssets} onStartOver={resetState} onGenerateNew={handleGenerate} />;
    }

    return (
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center justify-center min-h-[70vh] p-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Talk to Your
            </h1>
            <div className="relative h-14 sm:h-16 mt-2 overflow-hidden w-full">
                {roles.map((role, index) => (
                    <h1
                        key={role}
                        className={`gradient-text absolute w-full text-4xl sm:text-5xl font-extrabold tracking-tight transition-all duration-700 ease-in-out ${
                            index === currentRoleIndex
                                ? 'opacity-100 translate-y-0'
                                : index === (currentRoleIndex - 1 + roles.length) % roles.length
                                    ? 'opacity-0 -translate-y-full'
                                    : 'opacity-0 translate-y-full'
                        }`}
                    >
                        {role}
                    </h1>
                ))}
            </div>

            <div 
                ref={transcriptContainerRef}
                className="w-full h-64 mt-10 bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl border border-purple-400/30 shadow-2xl shadow-purple-500/30 p-4 overflow-y-auto flex flex-col space-y-2 scrollbar-thin scrollbar-thumb-gray-400/50 dark:scrollbar-thumb-gray-600/50 transition-shadow focus-within:shadow-purple-400/50">
                {transcript.map((msg, i) => (
                    <div key={i} className={`text-left text-sm ${msg.speaker === 'user' ? 'text-gray-800 dark:text-gray-200' : 'text-purple-800 dark:text-purple-300'}`}>
                        <strong className="font-semibold">{msg.speaker === 'user' ? 'You' : 'AI'}:</strong> {msg.text}
                    </div>
                ))}
                {phase === 'idle' && (
                    <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
                        Click the microphone to start brainstorming...
                    </div>
                )}
            </div>

            <div className="mt-8">
                <button
                    onClick={isListening ? handleStopConversation : handleStartConversation}
                    className={`group w-24 h-24 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50 hover:shadow-red-400/60' : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:scale-105 shadow-purple-500/50 hover:shadow-purple-400/60'}`}
                    aria-label={isListening ? 'Stop recording' : 'Start recording'}
                >
                    {isListening ? (
                        <div className="w-8 h-8 bg-white rounded-md"></div>
                    ) : (
                        <MicrophoneIcon />
                    )}
                </button>
            </div>
        </div>
    );
};