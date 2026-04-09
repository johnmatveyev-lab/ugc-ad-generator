
import React, { useState } from 'react';
import { RewindIcon } from './icons/RewindIcon';
import { FastForwardIcon } from './icons/FastForwardIcon';
import { soundService } from '../services/soundService';

interface SceneContinuationProps {
    onGenerate: (direction: 'previous' | 'next') => void;
    isLoading: boolean;
}

const ButtonLoader: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


export const SceneContinuation: React.FC<SceneContinuationProps> = ({ onGenerate, isLoading }) => {
    const [direction, setDirection] = useState<'previous' | 'next' | null>(null);

    const handleGenerate = (dir: 'previous' | 'next') => {
        soundService.click();
        setDirection(dir);
        onGenerate(dir);
    }
    
    return (
        <div className="bg-black/20 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden h-full flex flex-col border border-white/10">
            <div className="p-4 flex justify-between items-center bg-black/20">
                <div className="flex items-center space-x-3">
                    <h3 className="text-md font-bold text-slate-200">Continue the Story</h3>
                </div>
            </div>
            <div className="p-4 flex-grow flex flex-col justify-center items-center space-y-4">
                 <p className="text-sm text-slate-400 text-center">Generate the scene that comes before or after your main prompt.</p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                        onClick={() => handleGenerate('previous')}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-500"
                    >
                        {(isLoading && direction === 'previous') ? <ButtonLoader /> : <RewindIcon />}
                        <span className="ml-2">Previous Scene</span>
                    </button>
                    <button
                        onClick={() => handleGenerate('next')}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-500"
                    >
                         {(isLoading && direction === 'next') ? <ButtonLoader /> : <FastForwardIcon />}
                        <span className="ml-2">Next Scene</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
