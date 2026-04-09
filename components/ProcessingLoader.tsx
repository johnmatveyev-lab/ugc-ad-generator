
import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PendingCircleIcon } from './icons/PendingCircleIcon';

interface ProcessingLoaderProps {
  progress: number;
  currentStep: string;
  steps: string[];
}

const Step: React.FC<{
    step: string;
    status: 'completed' | 'in-progress' | 'pending';
    isLast: boolean;
}> = ({ step, status, isLast }) => {
    const getIcon = () => {
        switch (status) {
            case 'completed': return <CheckCircleIcon />;
            case 'in-progress': return <SpinnerIcon />;
            case 'pending': return <PendingCircleIcon />;
            default: return null;
        }
    };

    return (
        <li className="flex items-start">
            <div className="flex flex-col items-center mr-4">
                <div className="flex-shrink-0 h-6 w-6">{getIcon()}</div>
                {!isLast && (
                    <div className="w-px h-10 bg-gray-300 dark:bg-gray-700 relative mt-2">
                        <div
                            className="absolute top-0 left-0 w-full bg-purple-500 transition-all duration-500"
                            style={{ height: status === 'completed' ? '100%' : '0%' }}
                        ></div>
                    </div>
                )}
            </div>
            <div className={`pt-0.5 transition-colors duration-300 ${
                status === 'completed' ? 'text-gray-500 dark:text-gray-400' :
                status === 'in-progress' ? 'text-purple-600 dark:text-purple-400 font-semibold' :
                'text-gray-500 dark:text-gray-400'
            }`}>
                <span className="relative font-medium">
                    {step}
                    <span
                        className={`absolute top-1/2 left-0 h-[1.5px] bg-gray-500 dark:bg-gray-400 transform -translate-y-1/2 origin-left transition-transform duration-500 ease-in-out ${
                            status === 'completed' ? 'scale-x-100' : 'scale-x-0'
                        }`}
                        style={{ width: '100%' }}
                    ></span>
                </span>
            </div>
        </li>
    );
};


export const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({ progress, currentStep, steps }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((progress || 0) / 100) * circumference;
  const currentStepIndex = steps.findIndex(step => step === currentStep);

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center p-4 text-center w-full max-w-2xl mx-auto gap-8 lg:gap-12">
      <div className="flex-shrink-0">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full" viewBox="0 0 140 140">
            <circle
              className="text-gray-200 dark:text-gray-700"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="70"
              cy="70"
            />
            <circle
              className="text-purple-600"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="70"
              cy="70"
              transform="rotate(-90 70 70)"
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-gray-800 dark:text-white">
            {Math.round(progress || 0)}%
          </div>
        </div>
        <p className="mt-6 text-lg font-semibold text-gray-700 dark:text-gray-300">{currentStep || 'Initializing...'}</p>
      </div>

      <div className="w-full lg:w-auto">
        <ul className="text-left">
          {steps.map((step, index) => {
            let status: 'completed' | 'in-progress' | 'pending' = 'pending';
            if (index < currentStepIndex) {
              status = 'completed';
            } else if (index === currentStepIndex && progress < 100) {
              status = 'in-progress';
            } else if (progress >= 100) {
              status = 'completed';
            }

            return (
              <Step key={step} step={step} status={status} isLast={index === steps.length - 1} />
            );
          })}
        </ul>
      </div>
    </div>
  );
};
