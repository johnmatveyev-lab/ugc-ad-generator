

import React, { useState } from 'react';
import { Loader } from './Loader';
import { FilmIcon } from './icons/FilmIcon';

const ButtonLoader: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


interface VideoGeneratorProps {
    soraPrompt: string;
    videoUrl: string | null;
    onGenerate: (model: 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview') => void;
    onRemix: (remixPrompt: string) => void;
    isGenerating: boolean;
    isRemixing: boolean;
    error: string | null;
    generationProgress: string;
    hasApiKey: boolean;
    onSelectApiKey: () => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  soraPrompt,
  videoUrl,
  onGenerate,
  onRemix,
  isGenerating,
  isRemixing,
  error,
  generationProgress,
  hasApiKey,
  onSelectApiKey,
}) => {
  const [remixPrompt, setRemixPrompt] = useState('');

  const handleRemixClick = () => {
    if (!remixPrompt.trim() || isRemixing) return;
    onRemix(remixPrompt);
    setRemixPrompt('');
  };

  const isWorking = isGenerating || isRemixing;

  if (!hasApiKey) {
    return (
      <div className="text-center bg-yellow-500/10 backdrop-blur-xl p-6 rounded-2xl border border-yellow-400/30 shadow-2xl shadow-yellow-500/20">
        <p className="font-semibold text-gray-700 dark:text-yellow-200 mb-3">A Veo-enabled API key is required</p>
        <p className="text-sm text-gray-500 dark:text-yellow-300/80 mb-4">This ensures you are aware of potential billing for video generation.</p>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 dark:text-purple-400 hover:underline mb-4 block">Learn about billing</a>
        <button
          onClick={onSelectApiKey}
          className="px-5 py-2.5 text-sm font-medium rounded-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-400/40 text-white bg-purple-600 hover:bg-purple-700 focus:outline-none transition-shadow"
        >
          Select API Key
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      {!videoUrl && !isGenerating && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => onGenerate('veo-3.1-fast-generate-preview')} 
            disabled={isGenerating} 
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-400/40 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-shadow"
          >
            Generate with Veo (Fast)
          </button>
          <button 
            onClick={() => onGenerate('veo-3.1-generate-preview')} 
            disabled={isGenerating} 
            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-400/40 text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-shadow"
          >
            Generate with Veo (High Quality)
          </button>
        </div>
      )}

      {/* Status/Error Display */}
      {isWorking && (
        <div className="p-4 bg-black/20 rounded-lg">
          <Loader message={generationProgress || 'Starting generation...'} />
        </div>
      )}
      {error && !isWorking && (
        <div className="p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-lg text-sm" role="alert">
          <p><span className="font-semibold">Error:</span> {error}</p>
        </div>
      )}

      {/* Video Player & Remix */}
      {videoUrl && (
        <div className="space-y-6">
          <div className="aspect-[9/16] w-full max-w-sm mx-auto bg-black rounded-2xl flex items-center justify-center overflow-hidden border border-purple-400/20 shadow-2xl shadow-purple-500/20">
            <video src={videoUrl} controls loop className="w-full h-full object-cover" />
          </div>

          {/* Remix section */}
          <div>
            <label htmlFor="remix-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remix Video</label>
            <textarea
              id="remix-prompt"
              rows={3}
              value={remixPrompt}
              onChange={(e) => setRemixPrompt(e.target.value)}
              className="w-full p-3 bg-white/5 dark:bg-black/20 rounded-lg border border-purple-400/30 focus:ring-purple-500 focus:border-purple-400 transition"
              placeholder="Describe what should happen next, e.g., 'A friendly alien appears and offers the character a glowing fruit...'"
              disabled={isWorking}
            />
            <button onClick={handleRemixClick} disabled={isWorking || !remixPrompt.trim()} className="mt-3 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-2xl shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-400/50 transition-shadow text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50">
              {isRemixing ? <ButtonLoader /> : null}
              {isRemixing ? 'Remixing...' : 'Remix Video'}
            </button>
          </div>
        </div>
      )}
      
       {!videoUrl && !isWorking && (
           <div className="text-center p-4 border-2 border-dashed border-purple-400/40 rounded-lg">
                <FilmIcon />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Your generated video will appear here.</p>
           </div>
       )}

    </div>
  );
};