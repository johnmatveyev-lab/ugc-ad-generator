


import React, { useState, useRef } from 'react';
import { TranscriptIcon } from './icons/TranscriptIcon';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { EditIcon } from './icons/EditIcon';
import { generateSpeechFromText, playAudio } from '../services/geminiService';
import { soundService } from '../services/soundService';
import { useToast } from '../contexts/ToastContext';
import { Loader } from './Loader';

interface TranscriptCardProps {
    transcript: string;
    continuation: string;
    onTranscriptChange: (newTranscript: string) => void;
    onContinuationChange: (newContinuation: string) => void;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({ transcript, continuation, onTranscriptChange, onContinuationChange }) => {
    const [isEditingTranscript, setIsEditingTranscript] = useState(false);
    const [isEditingContinuation, setIsEditingContinuation] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const { addToast } = useToast();
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const handlePlayAudio = async (text: string) => {
        if (!text.trim() || isSpeaking) return;
        setIsSpeaking(true);
        soundService.click();
        try {
            const base64Audio = await generateSpeechFromText(text);
            // FIX: The playAudio function requires an AudioContext. We create one on first use.
            // We also now use the onEnded callback to correctly manage the isSpeaking state.
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            if(audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            const source = await playAudio(base64Audio, audioContextRef.current, () => {
                setIsSpeaking(false);
                audioSourceRef.current = null;
            });
            audioSourceRef.current = source;
            source.start();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to play audio.";
            addToast(message, 'error');
            soundService.error();
            setIsSpeaking(false);
        }
    };
    
    const renderContent = (
        isEditing: boolean,
        value: string,
        onChange: (val: string) => void,
        setEditing: (val: boolean),
        title: string
    ) => (
        <div className="group relative">
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-1">{title}</h4>
            {isEditing ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setEditing(false)}
                    autoFocus
                    className="w-full bg-slate-900/50 p-2 rounded-md text-slate-300 resize-none focus:outline-none ring-1 ring-cyan-500"
                />
            ) : (
                <p className="text-slate-300 text-sm leading-relaxed min-h-[40px]">
                    {value || <span className="text-slate-500 italic">No {title.toLowerCase()} available.</span>}
                </p>
            )}
             <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setEditing(!isEditing)}
                    className="p-1 rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
                    title={isEditing ? "Done" : "Edit"}
                >
                    <EditIcon />
                </button>
                 <button
                    onClick={() => handlePlayAudio(value)}
                    disabled={isSpeaking || !value}
                    className="p-1 rounded-md text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                    title="Play as speech"
                >
                    <SpeakerIcon />
                </button>
             </div>
        </div>
    );

    return (
        <div className="bg-black/20 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden h-full flex flex-col border border-white/10">
            <div className="p-4 flex justify-between items-center bg-black/20">
                <div className="flex items-center space-x-3">
                    <TranscriptIcon />
                    <h3 className="text-md font-bold text-slate-200">Transcript &amp; Voiceover</h3>
                </div>
            </div>
             {isSpeaking && <div className="px-4 -mb-2"><Loader message="Generating speech..." /></div>}
            <div className="p-4 flex-grow space-y-4">
                {renderContent(isEditingTranscript, transcript, onTranscriptChange, setIsEditingTranscript, "Transcript")}
                <div className="border-t border-white/10"></div>
                {renderContent(isEditingContinuation, continuation, onContinuationChange, setIsEditingContinuation, "Suggested Next Line")}
            </div>
        </div>
    );
};