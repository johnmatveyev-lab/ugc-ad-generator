

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Project, Scene } from '../types';
import { getProject, saveProject } from '../services/storageService';
import { getVideo } from '../services/db';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { FileUpload } from './FileUpload';
import { soundService } from '../services/soundService';
import { MusicIcon } from './icons/MusicIcon';
import { FolderIcon } from './icons/FolderIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { generateSpeechAudioUrl } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';

interface VideoStudioProps {
    projects: Project[];
    initialProjectId: string | null;
    onNavigateToEditor: (projectId: string) => void;
    onBackToDashboard: () => void;
    onNewProject: (file: File) => void;
}

interface TimelineScene {
    id: string;
    title: string;
    prompt: string;
    duration: number;
    startTime: number;
    thumbnail: string | null;
    isAsset?: boolean;
}

interface Clip {
    id: string;
    title: string;
    url: string;
    duration: number;
    startTime: number;
}


const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const PauseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);
const PlayButtonIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
    </svg>
);

const CloseButton: React.FC<{onClick: () => void}> = ({onClick}) => (
    <button onClick={onClick} className="ml-auto flex-shrink-0 p-1 rounded-full text-slate-300 hover:bg-white/20 hover:text-white transition-colors" title="Remove music">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>
);


export const VideoStudio: React.FC<VideoStudioProps> = ({ projects, initialProjectId, onNavigateToEditor, onBackToDashboard, onNewProject }) => {
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProjectId);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Player state
    const [mode, setMode] = useState<'source' | 'generated'>('source');
    const [videoUrl, setVideoUrl] = useState<string | null>(null); // For source mode
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [clips, setClips] = useState<Clip[]>([]); // For generated mode
    const [currentClipIndex, setCurrentClipIndex] = useState(0);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [totalDuration, setTotalDuration] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
    const { addToast } = useToast();

    // Timeline state
    const [timelineScenes, setTimelineScenes] = useState<TimelineScene[]>([]);
    
    const cleanupUrls = useCallback(() => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        clips.forEach(clip => URL.revokeObjectURL(clip.url));
    }, [videoUrl, clips]);
    
    const loadProject = useCallback(async (projectId: string | null) => {
        cleanupUrls();
        setVideoUrl(null);
        setClips([]);
        setTimelineScenes([]);
        setAudioUrl(null);

        if (!projectId) {
            setSelectedProject(null);
            return;
        }

        setIsLoading(true);
        const project = getProject(projectId);
        setSelectedProject(project);

        if (project?.hasMainSceneVideo) {
            setMode('generated');
            try {
                type ClipSource = { id: string; title: string; key: string; isAsset: boolean; };
                
                const clipSources: ClipSource[] = [];
                if (project.hasIntro) clipSources.push({ id: 'intro', title: 'Intro', key: `intro-${project.id}`, isAsset: true });
                (project.previousScenes || []).forEach((scene, i) => clipSources.push({ id: scene.id, title: `Scene ${i+1}`, key: scene.id, isAsset: false }));
                clipSources.push({ id: 'main', title: 'Main Scene', key: `main-${project.id}`, isAsset: true });
                (project.nextScenes || []).forEach((scene, i) => clipSources.push({ id: scene.id, title: `Scene ${clipSources.length}`, key: scene.id, isAsset: false }));
                if (project.hasOutro) clipSources.push({ id: 'outro', title: 'Outro', key: `outro-${project.id}`, isAsset: true });

                const getDuration = (file: File): Promise<number> => new Promise((resolve) => {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = () => {
                        URL.revokeObjectURL(video.src);
                        resolve(video.duration);
                    };
                    video.src = URL.createObjectURL(file);
                });
                
                const loadedClips: Clip[] = [];
                let runningTime = 0;

                for (const source of clipSources) {
                    const file = await getVideo(source.key);
                    if (file) {
                        const clipDuration = await getDuration(file);
                        loadedClips.push({
                            id: source.id,
                            title: source.title,
                            url: URL.createObjectURL(file),
                            duration: clipDuration,
                            startTime: runningTime,
                        });
                        runningTime += clipDuration;
                    }
                }
                
                setClips(loadedClips);
                setTotalDuration(runningTime);

            } catch (error) {
                console.error("Failed to load generated video assets:", error);
            }
        } else if (project) {
            setMode('source');
            try {
                const videoFile = await getVideo(project.id);
                if (videoFile) setVideoUrl(URL.createObjectURL(videoFile));
            } catch (error) {
                console.error("Failed to load source video:", error);
            }
        }
        setIsLoading(false);
    }, [cleanupUrls]);
    
    useEffect(() => {
        loadProject(currentProjectId);
        return () => cleanupUrls();
    }, [currentProjectId, loadProject]);
    
    // Setup source-based timeline
    useEffect(() => {
        if (mode === 'source' && selectedProject && duration > 0) {
            const mainPromptDescription = selectedProject.prompts?.soraPrompt?.description ?? '...';
            const scenes: (Scene & {title: string, thumbnail: string | null})[] = [
                ...selectedProject.previousScenes.map((s, i) => ({ ...s, title: `Prev ${i + 1}`, thumbnail: selectedProject.thumbnail })),
                ...(selectedProject.prompts ? [{ id: 'main', title: 'Main', prompt: mainPromptDescription, thumbnail: selectedProject.thumbnail }] : []),
                ...selectedProject.nextScenes.map((s, i) => ({ ...s, title: `Next ${i + 1}`, thumbnail: selectedProject.thumbnail }))
            ];
            
            const sceneDuration = duration / (scenes.length || 1);
            let startTime = 0;
            const scenesWithTiming = scenes.map(s => {
                const scene = { ...s, duration: sceneDuration, startTime };
                startTime += sceneDuration;
                return scene;
            });
            setTimelineScenes(scenesWithTiming);
            setTotalDuration(duration);
        }
    }, [mode, selectedProject, duration]);

    // Setup generated-based timeline
    useEffect(() => {
        if (mode === 'generated' && clips.length > 0) {
            setTimelineScenes(clips.map(clip => ({
                id: clip.id,
                title: clip.title,
                prompt: '',
                duration: clip.duration,
                startTime: clip.startTime,
                thumbnail: null,
                isAsset: true,
            })));
        }
    }, [mode, clips]);
    
     // Player Logic: Auto-play next clip
    useEffect(() => {
        if (mode === 'generated' && videoRef.current && clips[currentClipIndex]) {
            videoRef.current.src = clips[currentClipIndex].url;
            if (isPlaying) {
                videoRef.current.play().catch(e => console.error("Autoplay failed", e));
            }
        }
    }, [mode, clips, currentClipIndex]);


    const handleSelectProject = (projectId: string) => {
        soundService.toggle();
        setProgress(0);
        setIsPlaying(false);
        setCurrentClipIndex(0);
        setCurrentProjectId(projectId);
    };

    const handlePlayPause = () => {
        soundService.click();
        if (!videoRef.current) return;
        
        if (isPlaying) {
            videoRef.current.pause();
            audioRef.current?.pause();
        } else {
            if (videoRef.current.ended) { // If ended, restart
                if (mode === 'source') videoRef.current.currentTime = 0;
                if (mode === 'generated') setCurrentClipIndex(0);
                if(audioRef.current) audioRef.current.currentTime = 0;
                setProgress(0);
            }
            videoRef.current.play();
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };
    
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            if (mode === 'generated' && clips.length > 0) {
                const pastClipsDuration = clips.slice(0, currentClipIndex).reduce((sum, c) => sum + c.duration, 0);
                setProgress(pastClipsDuration + currentTime);
            } else {
                 setProgress(currentTime);
            }
        }
    };
    
    const handleClipEnded = () => {
        if (mode === 'generated') {
            if (currentClipIndex < clips.length - 1) {
                setCurrentClipIndex(prev => prev + 1);
            } else {
                setIsPlaying(false);
            }
        } else if (videoRef.current?.ended) {
            setIsPlaying(false);
        }
    }

    const handleGenerateOrAddMusic = async () => {
        soundService.click();
        if (!selectedProject) return;

        // If music already exists on the project, just add it to the player
        if (selectedProject.music?.url) {
            setAudioUrl(selectedProject.music.url);
            addToast('Music added to timeline', 'info');
            return;
        }
        
        // If there's a prompt but no music URL, generate it
        if (selectedProject.prompts.sunoPrompt) {
            setIsGeneratingMusic(true);
            try {
                const url = await generateSpeechAudioUrl(selectedProject.prompts.sunoPrompt);
                setAudioUrl(url);
                
                // Create the updated project object with the new music URL
                const updatedProject = {
                    ...selectedProject,
                    music: { url, prompt: selectedProject.prompts.sunoPrompt },
                    updatedAt: Date.now()
                };
                
                // Save the updated project to localStorage and update the local state
                saveProject(updatedProject);
                setSelectedProject(updatedProject);
                
                soundService.success();
                addToast('Music generated and added!', 'success');
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Unknown error';
                addToast(`Audio generation failed: ${message}`, 'error');
                soundService.error();
            } finally {
                setIsGeneratingMusic(false);
            }
        }
    };

    const activeScene = timelineScenes.find(s => progress >= s.startTime && progress < s.startTime + s.duration);
    const videoSource = mode === 'source' ? videoUrl : (clips[currentClipIndex]?.url || '');
    
    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <aside className="w-64 bg-black/20 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col">
                <button onClick={() => { soundService.toggle(); onBackToDashboard(); }} className="flex-shrink-0 flex items-center space-x-2 text-slate-300 hover:text-cyan-400 transition-colors mb-4">
                    <ArrowLeftIcon />
                    <span>Dashboard</span>
                </button>
                <h2 className="text-xl font-bold text-cyan-400 mb-4">Projects</h2>
                <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50 pr-2 -mr-2">
                    {projects.length > 0 ? (
                        <ul className="space-y-2">
                            {projects.map(p => (
                                <li key={p.id}>
                                    <button onClick={() => handleSelectProject(p.id)} className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${currentProjectId === p.id ? 'bg-cyan-500/20 ring-1 ring-cyan-400' : 'hover:bg-white/5'}`}>
                                        {p.thumbnail ? (
                                             <img src={`data:image/jpeg;base64,${p.thumbnail}`} alt={p.name} className="w-10 h-16 object-cover rounded-md flex-shrink-0 bg-slate-700" />
                                        ) : (
                                            <div className="w-10 h-16 rounded-md flex-shrink-0 bg-slate-800 flex items-center justify-center"><FolderIcon className="h-6 w-6 text-slate-600"/></div>
                                        )}
                                        <span className="font-semibold text-sm text-slate-200 truncate">{p.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400 text-sm">No projects found.</p>
                    )}
                </div>
            </aside>

            {/* Main Editor */}
            <main className="flex-grow flex flex-col p-4 md:p-6 bg-slate-950/50">
                {selectedProject ? (
                    <>
                        {/* Header & Preview */}
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 truncate">{selectedProject.name}</h1>
                            <button onClick={() => onNavigateToEditor(selectedProject.id)} className="flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md shadow-sm text-cyan-300 bg-cyan-500/30 hover:bg-cyan-500/40 border border-cyan-500/50">Edit Prompts</button>
                        </div>
                        <div className="flex-grow flex flex-col items-center justify-center">
                            <div className="aspect-[9/16] bg-black rounded-lg flex items-center justify-center text-slate-500 border border-white/10 overflow-hidden w-full max-w-[320px] shadow-2xl shadow-black/50">
                                <video
                                    ref={videoRef}
                                    key={videoSource}
                                    src={videoSource}
                                    className="w-full h-full object-cover"
                                    onTimeUpdate={handleTimeUpdate}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onEnded={handleClipEnded}
                                    onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                                />
                                {audioUrl && <audio ref={audioRef} src={audioUrl} loop/>}
                            </div>
                            <div className="w-full max-w-lg mt-4 space-y-3">
                                <div className="flex justify-center items-center gap-4">
                                    <button onClick={handlePlayPause} className="p-3 text-white hover:text-cyan-300 rounded-full transition-colors">{isPlaying ? <PauseIcon /> : <PlayButtonIcon />}</button>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="w-full flex-shrink-0 mt-6 bg-black/20 backdrop-blur-lg p-3 rounded-lg border border-white/10">
                             <div className="flex items-center text-xs text-slate-400 font-mono mb-2 px-2">
                               <span>{formatTime(progress)}</span><span className="mx-auto">Timeline</span><span>{formatTime(totalDuration)}</span>
                            </div>
                             <div className="relative w-full h-36 bg-white/5 rounded-md p-2 space-y-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                                <div className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-500" style={{ left: `${(progress / (totalDuration || 1)) * 100}%` }}><div className="absolute -top-2 -left-[5px] h-4 w-3 bg-red-500 rounded-sm"></div></div>
                                <div className="relative flex h-20">
                                    {timelineScenes.map(scene => (
                                        <div 
                                            key={scene.id}
                                            draggable={false}
                                            title={`${scene.title}\nStart: ${formatTime(scene.startTime)}\nDuration: ${formatTime(scene.duration)}`}
                                            className={`relative h-full flex-shrink-0 rounded-md overflow-hidden border-2 cursor-pointer group ${activeScene?.id === scene.id ? 'border-cyan-400 shadow-lg shadow-cyan-500/20' : 'border-transparent hover:border-white/20'}`}
                                            style={{ width: `${(scene.duration / (totalDuration || 1)) * 100}%` }}
                                        >
                                           {scene.thumbnail ? (
                                                <img src={`data:image/jpeg;base64,${scene.thumbnail}`} alt={scene.title} className="w-full h-full object-cover opacity-60"/>
                                            ) : scene.isAsset ? (
                                                <div className="w-full h-full bg-purple-900/50 flex items-center justify-center"><SparklesIcon /></div>
                                            ) : (
                                                <div className="w-full h-full bg-slate-800/50"></div>
                                            )}
                                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-1 flex flex-col justify-end">
                                                <p className="text-white text-xs font-semibold truncate">{scene.title}</p>
                                                <p className="text-slate-300 text-[10px] font-mono truncate">{formatTime(scene.duration)}</p>
                                           </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative flex items-center h-12">
                                     {audioUrl ? (
                                        <div className="w-full h-full bg-blue-900/40 rounded-md border border-blue-500/50 flex items-center px-3 gap-3">
                                            <MusicIcon />
                                            <p className="font-semibold text-blue-300 text-sm truncate">{selectedProject.music?.prompt || selectedProject.prompts.sunoPrompt}</p>
                                            <CloseButton onClick={() => setAudioUrl(null)} />
                                        </div>
                                    ) : (
                                        <button onClick={handleGenerateOrAddMusic} disabled={!selectedProject.prompts.sunoPrompt || isGeneratingMusic} className="w-full h-full text-center text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-300 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-dashed border-blue-500/30">
                                            {isGeneratingMusic 
                                                ? 'Generating Music...' 
                                                : selectedProject.music?.url 
                                                    ? '+ Add Generated Music' 
                                                    : '+ Generate & Add Music'
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <FolderIcon className="h-16 w-16 text-slate-600 mb-4" />
                        <h2 className="text-2xl font-bold text-slate-300">Select a project to start editing</h2>
                        <p className="text-slate-400 mt-2">Choose a project from the list on the left, or go to the dashboard to create a new one.</p>
                        <div className="mt-6 border-t border-white/10 pt-6 w-full max-w-md">
                             <h3 className="font-semibold text-slate-300 mb-4">Or create a new project here:</h3>
                            <FileUpload onFileChange={(file) => file && onNewProject(file)} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
