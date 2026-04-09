
import React from 'react';
import { Loader } from './Loader';
import { ImageIcon } from './icons/ImageIcon';

interface ThumbnailCardProps {
    prompt: string;
    onPromptChange: (newPrompt: string) => void;
    imageUrl: string | null;
    isLoading: boolean;
    onGenerate: () => void;
}

export const ThumbnailCard: React.FC<ThumbnailCardProps> = ({ prompt, onPromptChange, imageUrl, isLoading, onGenerate }) => {
    return (
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden h-full flex flex-col border border-purple-400/30">
            <div className="p-4">
                <h3 className="text-lg font-bold gradient-text mb-2">Thumbnail Prompt</h3>
                <textarea
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 dark:bg-black/20 p-2 rounded-md text-gray-600 dark:text-gray-300 resize-none focus:outline-none ring-1 ring-purple-400/30 focus:ring-purple-400 text-sm"
                    placeholder="Enter a prompt for the thumbnail..."
                />
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <div className="aspect-[9/16] w-full bg-black/20 rounded-lg flex items-center justify-center overflow-hidden">
                    {isLoading ? (
                        <Loader message="" />
                    ) : imageUrl ? (
                        <img src={imageUrl} alt="Generated thumbnail" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon />
                    )}
                </div>
                 <button
                    onClick={onGenerate}
                    disabled={isLoading || !prompt}
                    className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-2xl shadow-purple-500/30 hover:shadow-purple-400/40 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-shadow"
                >
                    {isLoading ? 'Generating...' : (imageUrl ? 'Regenerate' : 'Generate Thumbnail')}
                </button>
            </div>
        </div>
    );
};