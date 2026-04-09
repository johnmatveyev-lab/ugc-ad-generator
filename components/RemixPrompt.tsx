
import React, { useState } from 'react';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { soundService } from '../services/soundService';

interface RemixPromptProps {
  onRemix: (instruction: string) => Promise<any>;
  initialSuggestion: string;
}

const ButtonLoader: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const RemixPrompt: React.FC<RemixPromptProps> = ({ onRemix, initialSuggestion }) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isLoading) return;

    soundService.click();
    setIsLoading(true);
    try {
      await onRemix(instruction);
      setInstruction(''); // Clear input on success
    } catch (error) {
      console.error("Remix failed:", error);
      // The parent component ProjectEditor handles showing the toast.
    } finally {
      setIsLoading(false);
    }
  };
  
  const useSuggestion = () => {
      soundService.click();
      setInstruction(initialSuggestion);
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden h-full flex flex-col border border-white/10">
      <div className="p-4 flex justify-between items-center bg-black/20">
        <div className="flex items-center space-x-3">
          <MagicWandIcon />
          <h3 className="text-md font-bold text-slate-200">Remix Prompt</h3>
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <p className="text-sm text-slate-400 mb-2">Try this AI suggestion:</p>
        <button 
            onClick={useSuggestion}
            className="text-left text-sm italic text-cyan-400 p-3 rounded-md bg-cyan-900/30 hover:bg-cyan-900/50 transition mb-4 ring-1 ring-cyan-500/30"
        >
            "{initialSuggestion}"
        </button>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full flex-grow bg-slate-900/50 p-2 rounded-md text-slate-300 resize-none focus:outline-none ring-1 ring-cyan-500/50 focus:ring-cyan-500 text-sm"
            placeholder="e.g., Change the setting to a futuristic city..."
          />
          <button
            type="submit"
            disabled={isLoading || !instruction.trim()}
            className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500 transition-colors"
          >
            {isLoading ? <ButtonLoader /> : <PaperAirplaneIcon />}
            <span className="ml-2">{isLoading ? 'Remixing...' : 'Remix'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
