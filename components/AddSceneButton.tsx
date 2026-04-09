import React from 'react';
import { PlusIcon } from './icons/PlusIcon';

const ButtonLoader: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface AddSceneButtonProps {
    onClick: () => void;
    isLoading: boolean;
}

export const AddSceneButton: React.FC<AddSceneButtonProps> = ({ onClick, isLoading }) => {
    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-slate-700/50 text-slate-300 border-2 border-dashed border-slate-500 opacity-0 group-hover:opacity-100 group-hover:bg-slate-700/80 hover:border-cyan-400 hover:text-cyan-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
            aria-label="Add new scene"
            title="Generate new scene"
        >
            {isLoading ? <ButtonLoader /> : <PlusIcon />}
        </button>
    );
};