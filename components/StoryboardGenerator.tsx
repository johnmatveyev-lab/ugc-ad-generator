import React from 'react';
import { ClapperboardIcon } from './icons/ClapperboardIcon';

interface StoryboardGeneratorProps {
    onGenerate: () => void;
    isLoading: boolean;
    error: string | null;
    isDisabled: boolean;
}

const ButtonLoader: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const StoryboardGenerator: React.FC<StoryboardGeneratorProps> = ({
    onGenerate,
    isLoading,
    error,
    isDisabled,
}) => {
    return (
        <div>
            <h3 className="text-xl font-bold text-center mb-4 text-cyan-400">Finalize Story</h3>
            <div className="flex flex-col items-center">
                <button
                    onClick={onGenerate}
                    disabled={isLoading || isDisabled}
                    className="w-full max-w-sm inline-flex items-center justify-center px-6 py-3 border border-green-500/40 text-base font-medium rounded-md shadow-sm text-green-300 bg-green-500/20 hover:bg-green-500/30 disabled:bg-slate-500/10 disabled:text-slate-500 disabled:border-slate-500/20 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-green-500 transition-all duration-300"
                >
                    {isLoading ? (
                        <>
                            <ButtonLoader />
                            Generating Storyboard...
                        </>
                    ) : (
                        <>
                            <ClapperboardIcon />
                            <span className="ml-2">Generate Storyboard</span>
                        </>
                    )}
                </button>
                <p className="text-center text-xs text-slate-500 mt-2">Combine all scenes into a single prompt.</p>
                {error && (
                    <div className="mt-2 p-3 w-full max-w-sm bg-red-900/50 border border-red-600 text-red-300 rounded-lg text-sm" role="alert">
                        <p><span className="font-semibold">Error:</span> {error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};