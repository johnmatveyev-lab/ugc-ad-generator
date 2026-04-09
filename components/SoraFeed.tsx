import React, { useState, useRef } from 'react';
import { soraFeedData } from '../data/soraFeedData';
import type { SoraVideo } from '../data/soraFeedData';
import { InfoIcon } from './icons/InfoIcon';

export const SoraFeed: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<SoraVideo>(soraFeedData[0]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handleMouseEnter = (index: number) => {
    const videoEl = videoRefs.current[index];
    if (videoEl) {
      videoEl.play().catch(e => {
        console.warn("Could not play video on hover", e);
      });
    }
  };

  const handleMouseLeave = (index: number) => {
    const videoEl = videoRefs.current[index];
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, video: SoraVideo) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); 
      setSelectedVideo(video);
    }
  };
  
  return (
    <div className="mt-12 w-full">
      <h2 className="text-2xl font-bold text-center text-cyan-400">Explore Sora Creations</h2>
      
      <div className="mt-6">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
          {soraFeedData.map((video, index) => (
            <div
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              onKeyDown={(e) => handleKeyDown(e, video)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={() => handleMouseLeave(index)}
              role="button"
              tabIndex={0}
              aria-label={`Select video: ${video.prompt}`}
              className={`flex-shrink-0 w-40 h-72 rounded-lg overflow-hidden transition-all duration-300 focus:outline-none ring-offset-4 ring-offset-slate-900 cursor-pointer ${selectedVideo.id === video.id ? 'ring-4 ring-cyan-500' : 'ring-2 ring-slate-700 hover:ring-cyan-600'}`}
            >
              <video
                ref={(el) => { videoRefs.current[index] = el; }}
                src={video.videoUrl}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-4 bg-slate-800/60 rounded-lg ring-1 ring-slate-700 min-h-[100px]">
        <div className="flex items-start space-x-3">
          <InfoIcon />
          <div>
            <h3 className="font-semibold text-slate-300">Selected Prompt:</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              {selectedVideo.prompt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
