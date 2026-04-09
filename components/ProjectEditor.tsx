
import React, { useState, useEffect, useCallback } from 'react';
import { getProject, saveProject } from '../services/storageService';
import * as geminiService from '../services/geminiService';
import { saveVideo, getVideo } from '../services/db';
import type { Project, GeneratedPrompts } from '../types';
import { Loader } from './Loader';
import { useToast } from '../contexts/ToastContext';
import { ThumbnailCard } from './ThumbnailCard';
import { ScoreCard } from './ScoreCard';
import { MusicPlayerCard } from './MusicPlayerCard';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { VideoGenerator } from './VideoGenerator';

interface ProjectEditorProps {
  projectId: string;
  onBack: () => void;
  onSave: () => void;
}

export const ProjectEditor: React.FC<ProjectEditorProps> = ({ projectId, onBack, onSave }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [adConcept, setAdConcept] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
  const [hasCopiedScript, setHasCopiedScript] = useState(false);

  // Video Generation State
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [hasVeoApiKey, setHasVeoApiKey] = useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isRemixingVideo, setIsRemixingVideo] = useState(false);
  const [videoGenerationError, setVideoGenerationError] = useState<string | null>(null);

  const loadProjectData = useCallback(async () => {
    setIsLoading(true);
    setGeneratedVideoUrl(null);
    const proj = getProject(projectId);
    if (proj) {
      setProject(proj);
      if (proj.thumbnail) setThumbnailUrl(`data:image/jpeg;base64,${proj.thumbnail}`);
      if (proj.voiceover?.url) setVoiceoverUrl(proj.voiceover.url);
      if (proj.video?.key) {
        try {
            const file = await getVideo(proj.video.key);
            if (file) {
                const url = URL.createObjectURL(file);
                setGeneratedVideoUrl(url);
            }
        } catch (e) {
            console.error("Failed to load video from DB", e);
            addToast("Could not load generated video.", "error");
        }
      }
    } else {
      setError("Project not found.");
    }
    setIsLoading(false);
  }, [projectId, addToast]);
  
  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setHasVeoApiKey(hasKey);
        } else {
            // If the aistudio helper isn't available, assume API_KEY is in env and proceed.
            setHasVeoApiKey(true);
        }
    };
    checkKey();
    loadProjectData();

    return () => {
        if (generatedVideoUrl) {
            URL.revokeObjectURL(generatedVideoUrl);
        }
    };
  }, [projectId, loadProjectData]);
  
  const updatePrompts = (newPrompts: Partial<GeneratedPrompts>) => {
    if (!project) return;
    const updatedProject = {
      ...project,
      updatedAt: Date.now(),
      prompts: {
        ...project.prompts,
        ...newPrompts,
      },
    };
    setProject(updatedProject);
    saveProject(updatedProject);
    onSave();
  };
  
  const handleUpdateScript = (newScript: string) => {
      if (!project) return;
      updatePrompts({ soraPrompt: { ...project.prompts.soraPrompt, description: newScript } });
  }

  const handleGenerateScript = async () => {
      if (!adConcept.trim()) {
          addToast('Please describe your ad concept first.', 'error');
          return;
      }
      setIsGeneratingScript(true);
      try {
          // FIX: Called generateAllAssetsFromText as generateSoraPromptFromText does not exist.
          const result = await geminiService.generateAllAssetsFromText(adConcept);
          
          if (project) {
              // Construct the new SoraPromptObject
              const newSoraPrompt = {
                  ...project.prompts.soraPrompt, // keep old values as default
                  description: result.soraPrompt,
              };

              // Update project with new name and prompts
              const updatedProject: Project = { 
                  ...project, 
                  name: result.projectName, 
                  prompts: {
                      ...project.prompts,
                      soraPrompt: newSoraPrompt,
                      imagenPrompt: result.imagenPrompt,
                      transcript: result.transcript,
                      viralityAnalysis: result.viralityAnalysis,
                      viralityScore: result.viralityScore,
                  },
                  updatedAt: Date.now() 
              };
              setProject(updatedProject);
              saveProject(updatedProject);
              onSave();

              // Auto-copy feature and combined notification
              navigator.clipboard.writeText(result.soraPrompt);
              addToast('Script generated & auto-copied!', 'success');
          } else {
              // This case should not happen if the editor is open
              throw new Error("Project not loaded.");
          }
      } catch (e) {
          const message = e instanceof Error ? e.message : 'Failed to generate script.';
          addToast(message, 'error');
      } finally {
          setIsGeneratingScript(false);
      }
  };
  
  const handleCopyScript = () => {
    if (!project || hasCopiedScript) return;
    navigator.clipboard.writeText(project.prompts.soraPrompt.description);
    setHasCopiedScript(true);
    addToast('Script copied to clipboard!', 'success');
    setTimeout(() => setHasCopiedScript(false), 2000);
  };

  const handleGenerateThumbnail = async () => {
    if (!project) return;
    setIsGeneratingThumbnail(true);
    try {
      const imageBytes = await geminiService.generateImageWithImagen(project.prompts.imagenPrompt);
      setThumbnailUrl(`data:image/jpeg;base64,${imageBytes}`);
      
      const updatedProject: Project = { ...project, thumbnail: imageBytes, updatedAt: Date.now() };
      setProject(updatedProject);
      saveProject(updatedProject);
      onSave();

      addToast('Thumbnail generated!', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      addToast(`Thumbnail generation failed: ${message}`, 'error');
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const handleGenerateVoiceover = async () => {
      if (!project?.prompts.transcript) return;
      setIsGeneratingVoiceover(true);
      try {
          const url = await geminiService.generateSpeechAudioUrl(
              project.prompts.transcript,
              'Say in an energetic and enthusiastic tone, suitable for a fast-paced commercial ad:'
          );
          setVoiceoverUrl(url);
          setProject(p => {
              if (!p) return null;
              const updated = {...p, voiceover: { url, transcript: p.prompts.transcript }, updatedAt: Date.now()};
              saveProject(updated);
              onSave();
              return updated;
          });
          addToast('Voiceover generated!', 'success');
      } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          addToast(`Voiceover generation failed: ${message}`, 'error');
      } finally {
          setIsGeneratingVoiceover(false);
      }
  }

  const handleSelectApiKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // To mitigate race condition, assume key is selected and update UI.
        setHasVeoApiKey(true);
    } else {
        addToast('API key selection is not available in this environment.', 'error');
    }
  };
  
  const handleVeoApiError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    setVideoGenerationError(message);
    // As per guidelines, if the error is about a missing entity, it's likely a stale API key.
    if (message.includes("Requested entity was not found")) {
        addToast("API Key not found. Please select a valid key.", 'error');
        // Only prompt for a new key if the selection UI is available
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            setHasVeoApiKey(false); // Reset key state to re-prompt the user.
        }
    } else {
        addToast(`Video operation failed: ${message}`, 'error');
    }
  };
  
  const handleGenerateVideo = async (model: 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview') => {
    if (!project) return;
    setIsGeneratingVideo(true);
    setVideoGenerationProgress('');
    setVideoGenerationError(null);
    try {
        const { url, veoVideoObject, file } = await geminiService.generateVideoWithVeo(
            project.prompts.soraPrompt.description,
            model,
            (message: string) => setVideoGenerationProgress(message)
        );

        const videoKey = `veo-main-${project.id}`;
        await saveVideo(videoKey, file);

        const updatedProject: Project = {
            ...project,
            video: { veoVideoObject, key: videoKey },
            updatedAt: Date.now(),
        };
        setProject(updatedProject);
        saveProject(updatedProject);
        if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
        setGeneratedVideoUrl(url);
        onSave();
        addToast('Video generated successfully!', 'success');
    } catch (e) {
        handleVeoApiError(e);
    } finally {
        setIsGeneratingVideo(false);
    }
  };
  
  const handleRemixVideo = async (remixPrompt: string) => {
    if (!project?.video?.veoVideoObject) {
        addToast("No base video to remix. Please generate a video first.", "error");
        return;
    }
    setIsRemixingVideo(true);
    setVideoGenerationProgress('');
    setVideoGenerationError(null);
    try {
        const { url, veoVideoObject, file } = await geminiService.extendVideoWithVeo(
            project.video.veoVideoObject,
            remixPrompt,
            (message: string) => setVideoGenerationProgress(message)
        );
        
        const videoKey = `veo-remix-${project.id}-${Date.now()}`;
        await saveVideo(videoKey, file);
        
        const updatedProject: Project = {
            ...project,
            video: { veoVideoObject, key: videoKey },
            updatedAt: Date.now(),
        };
        setProject(updatedProject);
        saveProject(updatedProject);
        if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
        setGeneratedVideoUrl(url);
        onSave();
        addToast('Video remixed successfully!', 'success');
    } catch (e) {
        handleVeoApiError(e);
    } finally {
        setIsRemixingVideo(false);
    }
  };
  
  if (isLoading) return <div className="flex items-center justify-center h-[60vh]"><Loader message="Loading Project..." /></div>;
  if (error || !project) return <div className="text-center text-red-500">{error || 'Could not load project.'}</div>;

  const quickStarters = [ "This product changed my daily routine...", "I've been using this for 3 months...", "Why didn't I find this sooner?...", "The secret to [benefit] that nobody tells you...", ];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="mb-6 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Dashboard
      </button>
      <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-500/20 border border-purple-400/30 p-6 sm:p-8 space-y-12">
        {/* Main Script Generator */}
        <section>
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="text-xl font-bold gradient-text">AI Script Generator</h2>
          </div>
          <label htmlFor="ad-concept" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"> Describe your ad concept </label>
          <textarea id="ad-concept" rows={4} value={adConcept} onChange={(e) => setAdConcept(e.target.value)} className="w-full p-3 bg-white/5 dark:bg-black/20 rounded-lg border border-purple-400/30 focus:ring-purple-500 focus:border-purple-400 transition" placeholder="E.g., Create an energetic ad for a fitness app targeting young professionals who want to work out at home..."/>
          <button onClick={handleGenerateScript} disabled={isGeneratingScript} className="mt-4 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-2xl shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-400/50 transition-shadow text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50">
            {isGeneratingScript ? 'Generating...' : 'Generate Script with AI'}
          </button>
        </section>
        
        {/* Script Content */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold gradient-text">Script Content</h2>
            <button
              onClick={handleCopyScript}
              disabled={hasCopiedScript}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-600 dark:text-gray-300 bg-gray-100/10 dark:bg-gray-700/50 hover:bg-gray-200/20 dark:hover:bg-gray-700 disabled:opacity-70"
            >
              {hasCopiedScript ? (
                <>
                  <CheckIcon />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <textarea rows={10} value={project.prompts.soraPrompt.description} onChange={(e) => handleUpdateScript(e.target.value)} className="w-full p-3 bg-white/5 dark:bg-black/20 rounded-lg border border-purple-400/30 focus:ring-purple-500 focus:border-purple-400 transition" placeholder="Write your script or use AI to generate one above..."/>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Quick starters:</p>
            <div className="flex flex-wrap gap-2">
                {quickStarters.map((starter, index) => (
                    <button key={index} onClick={() => handleUpdateScript(project.prompts.soraPrompt.description + " " + starter)} className="px-3 py-1.5 text-xs font-medium bg-white/10 dark:bg-black/20 border border-purple-400/20 hover:bg-purple-500/10 text-gray-600 dark:text-gray-300 rounded-md transition">
                        {starter}
                    </button>
                ))}
            </div>
          </div>
        </section>
        
        {/* Generated Assets */}
        <section className="border-t border-purple-400/20 pt-8">
            <h2 className="text-xl font-bold mb-6 text-center gradient-text">Generated Assets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ThumbnailCard
                    prompt={project.prompts.imagenPrompt}
                    onPromptChange={(newPrompt) => updatePrompts({ imagenPrompt: newPrompt })}
                    imageUrl={thumbnailUrl}
                    isLoading={isGeneratingThumbnail}
                    onGenerate={handleGenerateThumbnail}
                />
                <ScoreCard score={project.prompts.viralityScore} analysis={project.prompts.viralityAnalysis} />
            </div>
            {project.prompts.transcript && (
                <div className="mt-8 max-w-lg mx-auto">
                    <MusicPlayerCard
                        transcript={project.prompts.transcript}
                        onGenerate={handleGenerateVoiceover}
                        isLoading={isGeneratingVoiceover}
                        voiceoverUrl={voiceoverUrl}
                    />
                </div>
            )}
        </section>

        {/* Video Generation */}
        <section className="border-t border-purple-400/20 pt-8">
            <h2 className="text-xl font-bold mb-6 text-center gradient-text">Video Generation</h2>
            <VideoGenerator
                soraPrompt={project.prompts.soraPrompt.description}
                videoUrl={generatedVideoUrl}
                onGenerate={handleGenerateVideo}
                onRemix={handleRemixVideo}
                isGenerating={isGeneratingVideo}
                isRemixing={isRemixingVideo}
                error={videoGenerationError}
                generationProgress={videoGenerationProgress}
                hasApiKey={hasVeoApiKey}
                onSelectApiKey={handleSelectApiKey}
            />
        </section>
      </div>
    </div>
  );
};
