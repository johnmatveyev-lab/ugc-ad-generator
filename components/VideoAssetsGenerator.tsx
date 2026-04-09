
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { Loader } from './Loader';
import { FilmIcon } from './icons/FilmIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { VideoEditorIcon } from './icons/VideoEditorIcon';
import { AddSceneButton } from './AddSceneButton';
import type { GeneratedPrompts, Scene } from '../types';

interface VideoAssetCardProps {
    type: string;
    assetUrl: string | null;
    isLoading: boolean;
    onGenerate: () => void;
    onRemix?: () => void;
    isDisabled: boolean;
    icon: React.ReactNode;
}

const VideoAssetCard: React.FC<VideoAssetCardProps> = ({ type, assetUrl, isLoading, onGenerate, onRemix, isDisabled, icon }) => {
    const hasAsset = assetUrl !== null;
    
    return (
        <div className="bg-black/20 backdrop-blur-lg rounded-xl p-3 border border-white/10 flex flex-col items-center text-center w-40 flex-shrink-0">
            <h4 className="font-bold text-md text-slate-200 mb-2 truncate w-full">{type}</h4>
            <div className="w-full aspect-[9/16] bg-slate-900 rounded-md flex items-center justify-center overflow-hidden">
                {isLoading ? (
                    <Loader message="" />
                ) : assetUrl ? (
                    <video src={assetUrl} controls loop className="w-full h-full object-cover" />
                ) : (
                    <div className="text-slate-500 p-2">
                        {icon}
                    </div>
                )}
            </div>
            <div className="w-full mt-3 flex items-center gap-2">
                 <button
                    onClick={onGenerate}
                    disabled={isDisabled || isLoading}
                    className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-purple-500/40 text-xs font-medium rounded-md shadow-sm text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-slate-500/10 disabled:text-slate-500 disabled:border-slate-500/20 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? "Working..." : hasAsset ? "Remix" : "Generate"}
                </button>
            </div>
        </div>
    );
};

interface VideoAssetsGeneratorProps {
    prompts: GeneratedPrompts;
    previousScenes: Scene[];
    nextScenes: Scene[];
    introUrl: string | null;
    outroUrl: string | null;
    mainSceneUrl: string | null;
    preMainSceneUrls: Record<string, string>;
    postMainSceneUrls: Record<string, string>;
    isGeneratingIntro: boolean;
    isGeneratingOutro: boolean;
    isGeneratingMain: boolean;
    generatingSceneId: string | null;
    error: string | null;
    onGenerateIntro: () => void;
    onGenerateOutro: () => void;
    onGenerateMain: () => void;
    onGenerateScene: (direction: 'previous' | 'next', contextPrompt: string, insertionIndex: number) => void;
    onGoToStudio: () => void;
    hasApiKey: boolean;
    onSelectApiKey: () => void;
    isDisabled: boolean;
}

export const VideoAssetsGenerator: React.FC<VideoAssetsGeneratorProps> = (props) => {
    const {
        prompts,
        previousScenes, nextScenes,
        introUrl, outroUrl, mainSceneUrl,
        preMainSceneUrls, postMainSceneUrls,
        isGeneratingIntro, isGeneratingOutro, isGeneratingMain,
        generatingSceneId, error,
        onGenerateIntro, onGenerateOutro, onGenerateMain, onGenerateScene,
        onGoToStudio, hasApiKey, onSelectApiKey, isDisabled
    } = props;
    
    type TimelineItem = {
        id: string;
        type: string;
        url: string | null;
        prompt: string;
        isLoading: boolean;
        onGenerate: () => void;
        icon: React.ReactNode;
    };
    
    const timelineItems: TimelineItem[] = [
        { id: 'intro', type: 'Intro', url: introUrl, prompt: '', isLoading: isGeneratingIntro, onGenerate: onGenerateIntro, icon: <SparklesIcon className="h-8 w-8 mx-auto" /> },
        ...previousScenes.map((scene, i) => ({ id: scene.id, type: `Scene ${i+1}`, url: preMainSceneUrls[scene.id] || null, prompt: scene.prompt, isLoading: generatingSceneId === scene.id, onGenerate: () => {}, icon: <FilmIcon/> })),
        { id: 'main', type: 'Main Scene', url: mainSceneUrl, prompt: prompts.soraPrompt.description, isLoading: isGeneratingMain, onGenerate: onGenerateMain, icon: <FilmIcon/> },
        ...nextScenes.map((scene, i) => ({ id: scene.id, type: `Scene ${previousScenes.length + i + 2}`, url: postMainSceneUrls[scene.id] || null, prompt: scene.prompt, isLoading: generatingSceneId === scene.id, onGenerate: () => {}, icon: <FilmIcon/> })),
        { id: 'outro', type: 'Outro', url: outroUrl, prompt: '', isLoading: isGeneratingOutro, onGenerate: onGenerateOutro, icon: <SparklesIcon className="h-8 w-8 mx-auto" /> },
    ];

    const soraPromptToString = (prompt: any): string => {
        if (!prompt) return '';
        const parts = [ prompt.description, ``, `---`, `Style: ${prompt.style}`, `Cinematography: ${prompt.cinematography}`, `Lighting: ${prompt.lighting}`, `Mood: ${prompt.mood}`, `Aspect Ratio: ${prompt.aspectRatio}` ];
        return parts.join('\n');
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-2 text-cyan-400">Video Assets</h2>
            <p className="text-center text-slate-400 text-sm mb-6">
                Generate and arrange a complete video sequence using Veo.
            </p>
            
            {(error) && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-lg text-sm" role="alert">
                    <p><span className="font-semibold">Error:</span> {error}</p>
                </div>
            )}
            
            {!hasApiKey ? (
                 <div className="text-center bg-yellow-900/30 border border-yellow-600/50 p-4 rounded-lg">
                    <p className="text-yellow-300 mb-3">A Veo-enabled API key is required to generate video assets.</p>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline mb-3 block">Learn about billing</a>
                    <button 
                        onClick={onSelectApiKey}
                        className="px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none"
                    >
                        Select API Key
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-center overflow-x-auto py-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                        <div className="inline-flex items-center gap-2 px-4">
                        {timelineItems.map((item, index) => {
                           const prevItem = index > 0 ? timelineItems[index-1] : null;
                           
                           // Determine context and action for the "+" button
                           let addSceneHandler = null;
                           if (prevItem) {
                               const isBeforeMain = timelineItems.slice(0, index).every(i => i.id !== 'main');
                               if(isBeforeMain) {
                                   const contextPrompt = soraPromptToString(prompts.soraPrompt);
                                   addSceneHandler = () => onGenerateScene('previous', contextPrompt, index - 1);
                               } else {
                                   const contextPrompt = prevItem.prompt;
                                   const postMainIndex = index - (previousScenes.length + 2);
                                   addSceneHandler = () => onGenerateScene('next', contextPrompt, postMainIndex);
                               }
                           }

                           return (
                                <React.Fragment key={item.id}>
                                   {addSceneHandler && (
                                        <div className="group relative h-24 flex items-center justify-center -mx-1">
                                            <AddSceneButton 
                                                onClick={addSceneHandler} 
                                                isLoading={!!generatingSceneId}
                                            />
                                        </div>
                                   )}
                                    <VideoAssetCard
                                        type={item.type}
                                        assetUrl={item.url}
                                        isLoading={item.isLoading}
                                        onGenerate={item.onGenerate}
                                        isDisabled={isDisabled || !!generatingSceneId}
                                        icon={item.icon}
                                    />
                                </React.Fragment>
                           );
                        })}
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <button 
                            onClick={onGoToStudio}
                            disabled={!mainSceneUrl}
                            className="w-full max-w-sm inline-flex items-center justify-center px-6 py-3 border border-green-500/40 text-base font-medium rounded-md shadow-sm text-green-300 bg-green-500/20 hover:bg-green-500/30 disabled:bg-slate-500/10 disabled:text-slate-500 disabled:border-slate-500/20 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-all duration-300"
                        >
                            <VideoEditorIcon className="h-5 w-5" />
                            <span className="ml-2">Save & Edit in Studio</span>
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Requires at least a main scene to be generated.</p>
                    </div>
                </>
            )}
        </div>
    );
};
