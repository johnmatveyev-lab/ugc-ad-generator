
import React, { useState } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { soundService } from '../services/soundService';

interface PromptCardProps {
  icon: React.ReactNode;
  title: string;
  prompt: string;
  isTextArea?: boolean;
  onPromptChange?: (newPrompt: string) => void;
  isEditable?: boolean;
}

export const PromptCard: React.FC<PromptCardProps> = ({ icon, title, prompt, isTextArea = true, onPromptChange, isEditable = false }) => {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
    soundService.click();
    navigator.clipboard.writeText(prompt);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="bg-black/20 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden h-full flex flex-col border border-white/10">
      <div className="p-4 flex justify-between items-center bg-black/20">
        <div className="flex items-center space-x-3">
          {icon}
          <h3 className="text-md font-bold text-slate-200">{title}</h3>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors flex items-center space-x-2"
          title="Copy prompt"
        >
          {hasCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <div className="p-4 flex-grow">
        {isEditable && onPromptChange ? (
           <textarea
             value={prompt}
             onChange={(e) => onPromptChange(e.target.value)}
             className="w-full h-full bg-transparent text-slate-300 resize-none focus:outline-none text-sm leading-relaxed"
           />
        ) : (
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{prompt}</p>
        )}
      </div>
    </div>
  );
};
