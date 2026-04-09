

import React from 'react';

export const MusicPlayerCard: React.FC<{transcript: string, onGenerate: () => void, isLoading: boolean, voiceoverUrl: string | null}> = ({ transcript, onGenerate, isLoading, voiceoverUrl }) => {
  return (
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-500/20 border border-purple-400/30 p-4">
      <h3 className="text-lg font-bold gradient-text mb-2">AI Voiceover</h3>
      <div className="space-y-4">
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transcript for voiceover:</p>
            <p className="text-sm italic text-gray-700 dark:text-gray-300 bg-black/20 p-2 rounded-md max-h-24 overflow-y-auto">"{transcript}"</p>
        </div>

        {voiceoverUrl && (
             <audio controls src={voiceoverUrl} className="w-full">
                Your browser does not support the audio element.
            </audio>
        )}
       
        <button
            onClick={onGenerate}
            disabled={isLoading || !transcript}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-2xl shadow-purple-500/30 hover:shadow-purple-400/40 text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-shadow"
        >
            {isLoading ? 'Generating Voiceover...' : (voiceoverUrl ? 'Regenerate Voiceover' : 'Generate Voiceover')}
        </button>
      </div>
    </div>
  );
};