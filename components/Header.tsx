
import React from 'react';
import { MenuIcon } from './icons/MenuIcon';
import type { User } from '../types';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

interface HeaderProps {
    user: User | null;
    onToggleTheme: () => void;
    isDarkMode: boolean;
    onNavigateHome: () => void;
    onSignIn: () => void;
    onSignOut: () => void;
    showDashboardVoiceControl?: boolean;
    onToggleDashboardVoiceControl?: () => void;
    isDashboardListening?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ user, onToggleTheme, isDarkMode, onNavigateHome, onSignIn, onSignOut, showDashboardVoiceControl = false, onToggleDashboardVoiceControl, isDashboardListening = false }) => {
    return (
        <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/10 dark:bg-black/20 border-b border-purple-400/30 shadow-2xl shadow-purple-500/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <button onClick={onNavigateHome} className="text-2xl font-bold gradient-text">UGC Ad Generator</button>
                    </div>
                    <div className="flex items-center space-x-4">
                         {showDashboardVoiceControl && (
                            <button 
                                onClick={onToggleDashboardVoiceControl} 
                                className={`p-2 rounded-full transition-colors ${isDashboardListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                title="Dashboard Voice Control"
                            >
                               <MicrophoneIcon />
                            </button>
                        )}
                        <button onClick={onToggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                           {isDarkMode ? <SunIcon /> : <MoonIcon />}
                        </button>
                        {user ? (
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                    <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full" />
                                    <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                                    {user.isPremium && (
                                        <span className="px-2 py-0.5 text-xs font-bold text-purple-600 bg-purple-200 dark:text-purple-200 dark:bg-purple-600/50 rounded-full">PRO</span>
                                    )}
                                </div>
                                <button onClick={onSignOut} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white">Logout</button>
                            </div>
                        ) : (
                            <button onClick={onSignIn} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};