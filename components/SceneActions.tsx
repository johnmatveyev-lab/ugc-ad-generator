
import React from 'react';
import { TrashIcon } from './icons/TrashIcon';
import { soundService } from '../services/soundService';

interface SceneActionsProps {
    scenePrompt: string;
    onDelete: () => void;
}

export const SceneActions: React.FC<SceneActionsProps> = ({ scenePrompt, onDelete }) => {
    return (
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 relative group animate-fade-in-up">
            <p className="text-slate-300 text-sm leading-relaxed pr-8">{scenePrompt}</p>
            <button 
                onClick={() => {
                    soundService.click();
                    onDelete();
                }} 
                className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete scene"
            >
                <TrashIcon />
            </button>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
