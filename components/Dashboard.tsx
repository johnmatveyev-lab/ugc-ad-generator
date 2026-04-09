
import React from 'react';
import type { Project } from '../types';
import { FolderIcon } from './icons/FolderIcon';
import { soundService } from '../services/soundService';

interface DashboardProps {
  projects: Project[];
  onNewProject: () => void;
  onOpenProject: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, onNewProject, onOpenProject }) => {
  return (
    <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 gradient-text">✨ Your Projects</h2>
            <p className="text-gray-500 dark:text-gray-400">Select an existing project or create a new one.</p>
        </div>
        
        {projects.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {projects.map(project => (
                    <button 
                        key={project.id} 
                        onClick={() => { soundService.click(); onOpenProject(project.id); }} 
                        className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-xl shadow-purple-900/20 dark:shadow-purple-400/20 border-2 border-purple-400/20 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-offset-4 focus:ring-offset-white dark:ring-offset-gray-950 hover:shadow-purple-500/30"
                        aria-label={`Open project: ${project.name}`}
                    >
                        {project.thumbnail ? (
                            <img src={`data:image/jpeg;base64,${project.thumbnail}`} alt={project.name} className="w-full h-full object-cover"/>
                        ) : (
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center"><FolderIcon className="h-12 w-12 text-gray-400 dark:text-gray-600" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h3 className="text-white font-bold text-sm leading-tight truncate">{project.name}</h3>
                        </div>
                    </button>
                ))}
                <button onClick={onNewProject} className="group aspect-[3/4] rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-500 hover:border-purple-500 hover:text-purple-500 transition-colors hover:bg-purple-500/5 dark:hover:bg-purple-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="mt-2 text-sm font-medium">New Ad</span>
                </button>
            </div>
        ) : (
            <div className="text-center py-16">
                 <FolderIcon className="h-16 w-16 text-slate-600 mb-4 mx-auto" />
                 <h3 className="text-xl font-bold text-slate-300">No projects yet!</h3>
                 <p className="text-slate-400 mt-2 mb-6">Create your first AI-generated ad to get started.</p>
                 <button onClick={onNewProject} className="inline-flex items-center px-8 py-3 text-base font-medium rounded-lg shadow-2xl shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-400/50 transition-shadow text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600">
                    Create New Ad →
                </button>
            </div>
        )}
    </div>
  );
};
