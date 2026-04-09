import React from 'react';

interface ScoreCardProps {
  score: {
    virality: number;
    hookRate: number;
    engagementPotential: number;
  };
  analysis: string;
}

const Gauge: React.FC<{ score: number; label: string; colorClass: string }> = ({ score, label, colorClass }) => {
    const radius = 42;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const safeScore = Math.max(0, Math.min(100, score || 0));
    const offset = circumference - (safeScore / 100) * circumference;

    return (
        <div className="relative w-20 h-20 flex-shrink-0"> {/* Smaller gauge container */}
            <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                    className="text-gray-200 dark:text-gray-700/50"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                />
                <circle
                    className={colorClass}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="50"
                    cy="50"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25, 1, 0.5, 1)' }}
                />
            </svg>
            {/* Use grid for perfect centering */}
            <div className="absolute inset-0 grid place-content-center text-center">
                <span className="text-2xl font-bold text-gray-800 dark:text-white leading-none tracking-tight">{safeScore}</span>
                <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{label}</p>
            </div>
        </div>
    );
};


export const ScoreCard: React.FC<ScoreCardProps> = ({ score, analysis }) => {
  return (
    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden h-full flex flex-col border border-purple-400/30 p-3">
        {/* Centered gauges with responsive gap */}
        <div className="w-full flex justify-center items-center gap-2 sm:gap-4">
            <Gauge score={score.virality} label="Virality" colorClass="text-purple-500" />
            <Gauge score={score.hookRate} label="Hook Rate" colorClass="text-indigo-500" />
            <Gauge score={score.engagementPotential} label="Engagement" colorClass="text-pink-500" />
        </div>
        {/* Smaller text and tighter margin for analysis */}
        <p className="mt-3 text-center text-gray-600 dark:text-gray-300 text-xs leading-relaxed max-w-sm mx-auto">
          {analysis}
        </p>
    </div>
  );
};