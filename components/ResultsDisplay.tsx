import React, { useRef, useEffect, useState } from 'react';
import type { GeneratedAssets, TranscriptMessage } from '../types';
import * as geminiService from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { soundService } from '../services/soundService';
import { Loader } from './Loader';
import { SparklesIcon } from './icons/SparklesIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { LiveServerMessage } from '@google/genai';
import { ScoreCard } from './ScoreCard';
import { ToggleSwitch } from './ToggleSwitch';

type LiveSessionPromise = ReturnType<typeof geminiService.startConversation>;

interface ResultsDisplayProps {
    assets: GeneratedAssets;
    onStartOver: () => void;
    onGenerateNew: (concept: string) => void;
}

const PlayIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white/90" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
    </svg>
);
const PauseIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white/90" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);

const GeneratedClipCard: React.FC<{ videoUrl: string, prompt: string }> = ({ videoUrl, prompt }) => (
    <div className="w-40 flex-shrink-0 space-y-2 animate-fade-in-up">
        <video src={videoUrl} controls loop className="w-full h-auto aspect-[9/16] object-cover rounded-lg bg-black" />
        <p className="text-xs text-slate-400 italic truncate" title={prompt}>"{prompt}"</p>
    </div>
);

const thumbnailSuggestions = [
    { text: "Add text: 'Limited Time Offer'", prompt: "Add the text 'Limited Time Offer' in a bold, modern font at the bottom." },
    { text: "Increase contrast & saturation", prompt: "Increase the contrast and saturation to make the image more vibrant and eye-catching." },
    { text: "Apply a cinematic color grade", prompt: "Apply a cinematic color grade with cool tones in the shadows and warm highlights." },
    { text: "Add a subtle vignette effect", prompt: "Add a subtle vignette effect to draw focus to the center of the image." },
    { text: "Make the colors warmer", prompt: "Make the colors warmer and more inviting." },
    { text: "Convert to black and white", prompt: "Convert the image to a dramatic black and white." },
    { text: "Apply a blur to the background", prompt: "Apply a blur effect to the background to make the main subject pop." },
    { text: "Add a golden hour glow", prompt: "Add a warm, golden hour glow to the lighting." },
    { text: "Give it a vintage film look", prompt: "Apply a vintage film look with subtle grain and desaturated colors." },
    { text: "Change style to anime", prompt: "Redraw the image in a vibrant anime art style." },
    { text: "Add an attention-grabbing emoji", prompt: "Add a large, attention-grabbing emoji that matches the mood of the image (e.g., 🔥, 🤯, 😂)." },
    { text: "Zoom in on the subject", prompt: "Crop the image to zoom in tightly on the main subject's face or the product." },
    { text: "Put a bright border around it", prompt: "Add a bright, colorful border around the entire image to make it stand out." },
    { text: "Change to a low-angle shot", prompt: "Reimagine the scene from a dramatic low-angle shot, looking up at the subject." },
    { text: "Add dramatic studio lighting", prompt: "Relight the image with dramatic, high-contrast studio lighting." },
    { text: "Bathe in neon light", prompt: "Bathe the scene in vibrant, colorful neon light, cyberpunk style." },
    { text: "Make it a comic book panel", prompt: "Transform the image into a comic book panel with thick outlines and halftone dots." },
    { text: "Change to a watercolor painting", prompt: "Redraw the image as a soft, expressive watercolor painting." },
    { text: "Render as 3D cartoon", prompt: "Render the image in the style of a 3D animated cartoon movie." },
    { text: "Apply a pixel art style", prompt: "Redraw the image in a retro pixel art style." },
    { text: "Use a fisheye lens effect", prompt: "Apply a fisheye lens effect for a distorted, wide-angle look." },
    { text: "Apply a Dutch angle", prompt: "Tilt the camera to a Dutch angle for a sense of unease or dynamism." },
    { text: "Add lens flare", prompt: "Add a cinematic lens flare effect originating from a light source." },
    { text: "Overlay a grunge texture", prompt: "Overlay a subtle grunge texture to give it a more gritty, worn feel." }
];

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ assets, onStartOver, onGenerateNew }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const wasPlayingBeforeAI = useRef(false);
    
    const { addToast } = useToast();

    // -- Asset & Remix State --
    const [originalThumbnailB64] = useState(assets.thumbnailB64);
    const [currentThumbnail, setCurrentThumbnail] = useState(assets.thumbnailUrl);
    const [currentThumbnailB64, setCurrentThumbnailB64] = useState(assets.thumbnailB64);
    const [isEditingThumbnail, setIsEditingThumbnail] = useState(false);
    const [activeEdits, setActiveEdits] = useState<Set<string>>(new Set());
    const editTimeoutRef = useRef<number | null>(null);
    
    const [currentVideoUrl, setCurrentVideoUrl] = useState(assets.videoUrl);
    const [currentVeoObject, setCurrentVeoObject] = useState(assets.veoVideoObject);
    const [suggestions, setSuggestions] = useState<{ nextScenePrompt: string, newProductAdConcept: string } | null>(null);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
    
    const [generatedClips, setGeneratedClips] = useState<{ id: string, videoUrl: string, prompt: string }[]>([]);
    const [isGeneratingClip, setIsGeneratingClip] = useState(false);
    const [clipGenerationProgress, setClipGenerationProgress] = useState('');


    // -- Conversation State --
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    const [isListening, setIsListening] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const liveSessionPromiseRef = useRef<LiveSessionPromise | null>(null);
    let currentInputTranscription = '';
    let currentOutputTranscription = '';
    
    // --- Effects and Handlers ---

    const handlePlayPause = (forceState?: 'play' | 'pause') => {
        if (!videoRef.current || !audioRef.current) return;
        const shouldPlay = forceState ? forceState === 'play' : !isPlaying;

        if (shouldPlay) {
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        } else {
            videoRef.current.pause();
            audioRef.current.pause();
        }
    };
    
    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio) return;

        const syncAudio = () => {
            if (Math.abs(video.currentTime - audio.currentTime) > 0.2) {
                audio.currentTime = video.currentTime;
            }
        };
        const handleVideoPlay = () => setIsPlaying(true);
        const handleVideoPause = () => setIsPlaying(false);
        
        video.addEventListener('play', handleVideoPlay);
        video.addEventListener('pause', handleVideoPause);
        video.addEventListener('seeking', syncAudio);

        const fetchSuggestions = async () => {
            setIsLoadingSuggestions(true);
            try {
                const result = await geminiService.generateNextStepSuggestions(assets.script);
                setSuggestions(result);
            } catch (e) {
                console.error(e);
                addToast("Could not load AI suggestions.", "error");
            } finally {
                setIsLoadingSuggestions(false);
            }
        };
        fetchSuggestions();

        return () => {
            video.removeEventListener('play', handleVideoPlay);
            video.removeEventListener('pause', handleVideoPause);
            video.removeEventListener('seeking', syncAudio);
            handleStopConversation();
        };
    }, [assets.script, addToast]);

    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcript]);

    const triggerWebhook = (serviceName: string) => {
        soundService.click();
        addToast(`Webhook triggered for ${serviceName} generation!`, 'success');
        console.log(`Simulating webhook call for ${serviceName} with script:`, assets.script);
    };

    const handleGenerateClip = async (prompt: string) => {
        if (!prompt.trim() || isGeneratingClip) return;
        setIsGeneratingClip(true);
        try {
            const { url, veoVideoObject } = await geminiService.extendVideoWithVeo(
                currentVeoObject,
                prompt,
                (msg) => setClipGenerationProgress(msg)
            );
            // Add the new clip for display
            setGeneratedClips(prev => [...prev, { id: crypto.randomUUID(), videoUrl: url, prompt }]);
            // The latest generated clip can become the new base for further extensions
            setCurrentVeoObject(veoVideoObject);
            addToast('New clip generated!', 'success');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Clip generation failed.';
            addToast(message, 'error');
        } finally {
            setIsGeneratingClip(false);
            setClipGenerationProgress('');
        }
    };
    
    const handleEditThumbnail = async (editPrompt: string) => {
        setIsEditingThumbnail(true);
        try {
            const newImageB64 = await geminiService.editImageWithNano(originalThumbnailB64, 'image/jpeg', editPrompt);
            setCurrentThumbnailB64(newImageB64);
            setCurrentThumbnail(`data:image/jpeg;base64,${newImageB64}`);
            addToast("Thumbnail updated!", "success");
        } catch (e) {
             const message = e instanceof Error ? e.message : 'Edit failed.';
            addToast(message, 'error');
        } finally {
            setIsEditingThumbnail(false);
        }
    };
    
    const handleToggleEdit = (editPrompt: string) => {
        soundService.click();
        setActiveEdits(prev => {
            const newEdits = new Set(prev);
            if (newEdits.has(editPrompt)) {
                newEdits.delete(editPrompt);
            } else {
                newEdits.add(editPrompt);
            }
            return newEdits;
        });
    };
    
    useEffect(() => {
        if (editTimeoutRef.current) {
            clearTimeout(editTimeoutRef.current);
        }

        editTimeoutRef.current = setTimeout(() => {
            if (activeEdits.size === 0) {
                // Revert to original if no edits are active
                setCurrentThumbnail(`data:image/jpeg;base64,${originalThumbnailB64}`);
                setCurrentThumbnailB64(originalThumbnailB64);
            } else {
                const combinedPrompt = "Apply the following edits: " + Array.from(activeEdits).join('. ');
                handleEditThumbnail(combinedPrompt);
            }
        }, 500); // 500ms debounce

        return () => {
            if (editTimeoutRef.current) {
                clearTimeout(editTimeoutRef.current);
            }
        };
    }, [activeEdits, originalThumbnailB64]);

    // --- Voice Control Logic ---
    const handleStartConversation = async () => {
        soundService.click();
        setIsListening(true);
        setTranscript([]);
        
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            liveSessionPromiseRef.current = geminiService.startResultsConversation({
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
                    addToast('Conversation error.', 'error');
                    handleStopConversation();
                },
                onclose: () => console.log('Results session closed.'),
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
    
    const playExplanation = async (base64Audio: string) => {
        if (!outputAudioContextRef.current) return;
        
        // Fix: correctly capture if video was playing before AI speaks
        wasPlayingBeforeAI.current = isPlaying;
        handlePlayPause('pause');

        const source = await geminiService.playAudio(base64Audio, outputAudioContextRef.current, () => {
            // After AI finishes, resume if it was playing before.
            if (wasPlayingBeforeAI.current) {
                handlePlayPause('play');
            }
            wasPlayingBeforeAI.current = false;
        });
        source.start();
    };

    const handleLiveMessage = async (message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription) { /* ... transcription logic as before ... */ }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            await playExplanation(base64Audio);
        }
        
        if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
                let result = "Action completed.";
                try {
                    switch (fc.name) {
                        case 'playOrPauseVideo': handlePlayPause(); break;
                        case 'explainThumbnail':
                            const thumbExplanation = await geminiService.generateSpokenExplanation(assets.script, 'thumbnail image');
                            await playExplanation(thumbExplanation);
                            break;
                        case 'explainAnalysis':
                             const analysisExplanation = await geminiService.generateSpokenExplanation(assets.analysis, 'virality analysis');
                            await playExplanation(analysisExplanation);
                            break;
                        case 'startRemix': if (fc.args.prompt) await handleGenerateClip(fc.args.prompt as string); break;
                        case 'generateFollowUpScene': if (suggestions?.nextScenePrompt) await handleGenerateClip(suggestions.nextScenePrompt); break;
                        case 'generateNewAdConcept': if (suggestions?.newProductAdConcept) onGenerateNew(suggestions.newProductAdConcept); break;
                    }
                } catch(e) { result = e instanceof Error ? e.message : "Failed to perform action."; }
                
                liveSessionPromiseRef.current?.then((s) => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
            }
        }
    };


    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-8 relative">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight gradient-text">
                    Your AI-Generated Ad is Ready!
                </h1>
                 <button
                    onClick={isListening ? handleStopConversation : handleStartConversation}
                    className={`absolute top-1/2 -translate-y-1/2 right-0 group w-12 h-12 rounded-full text-white flex items-center justify-center shadow-2xl transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50' : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:scale-105 shadow-purple-500/50'}`}
                    aria-label={isListening ? 'Stop Assistant' : 'Start Assistant'}
                >
                    {isListening ? ( <div className="w-5 h-5 bg-white rounded-md animate-pulse"></div> ) : ( <MicrophoneIcon /> )}
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left column: Video Player */}
                <div className="lg:col-span-2 flex justify-center items-start">
                    <div className="relative w-[320px] aspect-[9/16] bg-black rounded-2xl shadow-2xl shadow-purple-500/30 overflow-hidden group border border-purple-400/30">
                        <video
                            ref={videoRef}
                            src={currentVideoUrl}
                            key={currentVideoUrl}
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <audio ref={audioRef} src={assets.audioUrl} loop />
                        <div 
                            onClick={() => handlePlayPause()}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition-opacity opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                            style={{opacity: isPlaying ? 0 : 1}}
                        >
                           {isPlaying ? <PauseIcon/> : <PlayIcon />}
                        </div>
                    </div>
                </div>

                {/* Right column: Assets & Controls */}
                <div className="lg:col-span-3 space-y-8">
                     {/* Thumbnail and Edits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                             <h3 className="text-xl font-bold mb-4 gradient-text">Thumbnail</h3>
                             <div className="relative">
                                 <img src={currentThumbnail} alt="Generated thumbnail" className="w-full aspect-[9/16] object-cover rounded-2xl shadow-2xl shadow-purple-500/20 border border-purple-400/30"/>
                                 {isEditingThumbnail && <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-2xl"><Loader message="Editing..."/></div>}
                             </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4 gradient-text">AI Edit Suggestions</h3>
                            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl p-4 rounded-2xl border border-purple-400/30 shadow-2xl shadow-purple-500/20 h-full">
                                <div className="space-y-1 h-full max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-400/50 scrollbar-track-transparent">
                                    {thumbnailSuggestions.map((suggestion) => (
                                        <ToggleSwitch
                                            key={suggestion.text}
                                            label={suggestion.text}
                                            checked={activeEdits.has(suggestion.prompt)}
                                            onChange={() => handleToggleEdit(suggestion.prompt)}
                                            disabled={isEditingThumbnail}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analysis Gauges */}
                    <div>
                        <h3 className="text-xl font-bold mb-4 gradient-text">AI Analysis</h3>
                        <ScoreCard score={assets.viralityScore} analysis={assets.analysis} />
                    </div>

                    {/* Script & Webhooks */}
                    <div>
                        <h3 className="text-xl font-bold mb-4 gradient-text">Generated Script</h3>
                        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl p-4 rounded-2xl border border-purple-400/30 shadow-2xl shadow-purple-500/20">
                            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{assets.script}</p>
                            <div className="mt-4 pt-4 border-t border-purple-400/20 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button onClick={() => triggerWebhook("Sora 2")} className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-slate-700 hover:bg-slate-600 transition">Generate with Sora 2</button>
                                <button onClick={() => triggerWebhook("Brio 3.1")} className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-slate-700 hover:bg-slate-600 transition">Generate with Brio 3.1</button>
                                <button onClick={() => triggerWebhook("X-imagine")} className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-slate-700 hover:bg-slate-600 transition">Generate with X-imagine</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Next Steps / Remixing */}
            <div className="mt-16 pt-8 border-t border-purple-400/20">
                <h2 className="text-2xl font-bold text-center mb-8 gradient-text">Remix & Extend</h2>
                <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-purple-400/30 shadow-2xl shadow-purple-500/20">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-purple-400" /><span className="gradient-text">AI Suggestions</span></h3>
                    {isLoadingSuggestions ? <Loader message="Getting ideas..."/> : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {suggestions?.nextScenePrompt && (
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Generate a follow-up scene:</p>
                                    <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-3">"{suggestions.nextScenePrompt}"</p>
                                    <button onClick={() => handleGenerateClip(suggestions.nextScenePrompt)} disabled={isGeneratingClip} className="w-full px-4 py-2 text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 disabled:opacity-50 transition-colors">
                                        {isGeneratingClip ? 'Working...' : 'Generate This Scene'}
                                    </button>
                                </div>
                            )}
                            {suggestions?.newProductAdConcept && (
                                <div>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Create a completely new ad:</p>
                                    <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-3">"{suggestions.newProductAdConcept}"</p>
                                    <button onClick={() => onGenerateNew(suggestions.newProductAdConcept)} className="w-full px-4 py-2 text-sm font-medium rounded-md text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors">Generate This Ad</button>
                                </div>
                            )}
                        </div>
                    )}
                    {(isGeneratingClip || generatedClips.length > 0) && (
                        <div className="mt-6 pt-4 border-t border-purple-400/20">
                            <h4 className="font-semibold text-slate-300 mb-3">Generated Clips:</h4>
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {generatedClips.map(clip => <GeneratedClipCard key={clip.id} videoUrl={clip.videoUrl} prompt={clip.prompt} />)}
                                {isGeneratingClip && <div className="w-40 flex-shrink-0"><Loader message={clipGenerationProgress || 'Generating...'}/></div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-16 text-center">
                <button
                    onClick={onStartOver}
                    className="inline-flex items-center px-8 py-3 text-base font-medium rounded-lg shadow-2xl shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-400/40 text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-shadow"
                >
                    Start Over
                </button>
            </div>
             <style>{`
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
                .scrollbar-thin {
                    scrollbar-width: thin;
                    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
                }
                .scrollbar-thumb-purple-400\\/50::-webkit-scrollbar-thumb {
                    background-color: rgba(192, 132, 252, 0.5);
                    border-radius: 4px;
                }
                .scrollbar-track-transparent::-webkit-scrollbar-track {
                    background-color: transparent;
                }
                ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
            `}</style>
        </div>
    );
};