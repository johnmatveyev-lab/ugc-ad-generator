
import type { Project } from '../types';
import { deleteVideo } from './db';

const PROJECTS_KEY = 'sora-prompter-projects';

export function getProjects(): Project[] {
    try {
        const projectsJson = localStorage.getItem(PROJECTS_KEY);
        if (!projectsJson) return [];
        const projects = JSON.parse(projectsJson) as Project[];
        
        // Migration for various fields for backward compatibility
        projects.forEach(p => {
            // SoraPrompt migration
            if (p.prompts && typeof p.prompts.soraPrompt === 'string') {
                const description = p.prompts.soraPrompt as any as string;
                (p.prompts.soraPrompt as any) = {
                    description: description,
                    style: 'cinematic',
                    cinematography: '9:16 vertical video',
                    lighting: 'natural light',
                    mood: 'neutral',
                    aspectRatio: '9:16 vertical video',
                };
            }
            // ImagenPrompt migration
            if (p.prompts && (p.prompts as any).nanoBananaPrompt) {
                p.prompts.imagenPrompt = (p.prompts as any).nanoBananaPrompt;
                delete (p.prompts as any).nanoBananaPrompt;
            }
            // Add scene arrays if they don't exist
            if (!p.previousScenes) p.previousScenes = [];
            if (!p.nextScenes) p.nextScenes = [];
        });

        // Sort by most recently updated, falling back to createdAt for older projects
        return projects.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
    } catch (e) {
        console.error("Failed to parse projects from localStorage", e);
        return [];
    }
}

export function getProject(projectId: string): Project | undefined {
    const projects = getProjects();
    return projects.find(p => p.id === projectId);
}

export function saveProject(project: Project): void {
    const projects = getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    if (existingIndex > -1) {
        projects[existingIndex] = project;
    } else {
        projects.unshift(project); // Add to the beginning
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function deleteProject(projectId: string): void {
    let projects = getProjects();
    projects = projects.filter(p => p.id !== projectId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    
    // Asynchronously delete the original video from IndexedDB
    deleteVideo(projectId).catch(err => {
        // This is not a critical error if the asset just doesn't exist.
        console.warn(`Could not delete video key ${projectId} from IndexedDB:`, err);
    });
}
