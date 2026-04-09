
import React from 'react';
import { HomeIcon } from './icons/HomeIcon';
import { soundService } from '../services/soundService';

interface SidebarProps {
    isExpanded: boolean;
    setExpanded: (expanded: boolean) => void;
    onNavigateToDashboard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded, setExpanded, onNavigateToDashboard }) => {
    
    const handleNav = (navFunc: () => void) => {
        soundService.toggle();
        navFunc();
    }
    
    return (
        <aside 
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            className={`fixed inset-y-0 left-0 z-30 flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl p-3 hidden md:flex transition-all duration-300 ease-in-out ${isExpanded ? 'w-64' : 'w-20'}`}
        >
            <div className={`flex items-center space-x-3 text-white overflow-hidden ${isExpanded ? 'p-3' : 'justify-center'}`}>
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m0 8H3m14-8h4m0 8h-4M3 4h18a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                </div>
                <h2 className={`text-xl font-bold whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>Sora Prompter</h2>
            </div>

            <nav className="mt-10 flex-1">
                <ul className="space-y-2">
                    <li>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleNav(onNavigateToDashboard); }} className={`flex items-center text-white font-semibold rounded-lg transition-all duration-200 ${isExpanded ? 'space-x-3 p-3' : 'justify-center w-14 h-14 mx-auto'} bg-white/10`}>
                            <HomeIcon />
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>Projects</span>
                        </a>
                    </li>
                </ul>
            </nav>
        </aside>
    );
};
