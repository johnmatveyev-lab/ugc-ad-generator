import React from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface UpgradeModalProps {
    onClose: () => void;
    onUpgrade: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose, onUpgrade }) => {
    return (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
        >
            <div 
                className="bg-slate-900 border border-purple-500/50 rounded-2xl p-8 shadow-2xl max-w-md w-full m-4 relative animate-fade-in-up text-white"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors" aria-label="Close">
                    <CloseIcon />
                </button>
                
                <div className="text-center">
                    <h2 id="upgrade-title" className="text-3xl font-bold gradient-text">Go Pro</h2>
                    <p className="text-slate-400 mt-2">You've used all your free generations. Upgrade to continue creating!</p>
                </div>

                <div className="mt-8 p-6 bg-black/20 rounded-lg border border-white/10">
                    <h3 className="text-xl font-semibold text-cyan-400">Pro Plan</h3>
                    <p className="text-4xl font-bold my-2">$19<span className="text-lg font-medium text-slate-400">/mo</span></p>
                    
                    <ul className="space-y-3 mt-4 text-left">
                        <li className="flex items-center">
                            <CheckCircleIcon />
                            <span className="ml-3 text-slate-300">Unlimited video generations</span>
                        </li>
                        <li className="flex items-center">
                            <CheckCircleIcon />
                            <span className="ml-3 text-slate-300">Full project history</span>
                        </li>
                         <li className="flex items-center">
                            <CheckCircleIcon />
                            <span className="ml-3 text-slate-300">Access to all AI models</span>
                        </li>
                        <li className="flex items-center">
                            <CheckCircleIcon />
                            <span className="ml-3 text-slate-300">Priority support</span>
                        </li>
                    </ul>
                </div>
                
                <button
                    onClick={onUpgrade}
                    className="mt-8 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-2xl shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-400/50 transition-shadow text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                >
                    Upgrade with Stripe
                </button>
                <p className="text-xs text-slate-500 text-center mt-3">This is a demo. Clicking will unlock Pro features instantly.</p>

            </div>
             <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
