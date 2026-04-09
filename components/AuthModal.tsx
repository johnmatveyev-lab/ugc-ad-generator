import React, { useState } from 'react';
import * as authService from '../services/authService';
import { GoogleIcon } from './icons/GoogleIcon';
import { CloseIcon } from './icons/CloseIcon';
import type { User } from '../types';

interface AuthModalProps {
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
}

const ButtonLoader: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
    const [step, setStep] = useState<'initial' | 'form'>('initial');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            const user = authService.signInOrSignUp(name, email);
            if (user) {
                onLoginSuccess(user);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderInitialStep = () => (
        <>
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-cyan-400">Welcome</h2>
                <p className="text-slate-400 text-sm mt-2">
                    Sign in to save and manage your projects across sessions.
                </p>
            </div>
            <button
                onClick={() => setStep('form')}
                className="w-full inline-flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-colors"
            >
                <GoogleIcon />
                <span className="ml-3">Sign In with Google</span>
            </button>
             <div className="text-xs text-slate-500 pt-4 text-center">
                This is a demo. Your account is stored in your browser's local storage.
            </div>
        </>
    );
    
    const renderFormStep = () => (
         <>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-cyan-400">Confirm Your Account</h2>
                <p className="text-slate-400 text-sm mt-1">
                    Enter your details to continue.
                </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoFocus
                        placeholder="Alex Rivera"
                        className="mt-1 block w-full px-3 py-2 bg-black/20 backdrop-blur-lg border border-white/10 rounded-md text-sm shadow-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email Address</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="alex.rivera@example.com"
                        className="mt-1 block w-full px-3 py-2 bg-black/20 backdrop-blur-lg border border-white/10 rounded-md text-sm shadow-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                </div>
                 {error && <p className="text-red-400 text-sm">{error}</p>}
                <div>
                    <button
                        type="submit"
                        disabled={isLoading || !name || !email}
                        className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
                    >
                        {isLoading ? <ButtonLoader /> : 'Confirm and Continue'}
                    </button>
                </div>
            </form>
        </>
    );


    return (
        <div 
            className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center backdrop-blur-sm" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl max-w-sm w-full m-4 relative animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors" aria-label="Close">
                    <CloseIcon />
                </button>
                
                {step === 'initial' ? renderInitialStep() : renderFormStep()}
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