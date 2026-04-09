// A simple service to play UI sounds using the Web Audio API.
// This avoids needing to host and load audio files.

class SoundService {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isInitialized = false;

    private initialize() {
        // Initialization must be triggered by a user gesture (e.g., a click)
        if (this.isInitialized || typeof window === 'undefined') return;
        
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.25; // Keep sounds subtle
            this.masterGain.connect(this.audioContext.destination);
            this.isInitialized = true;
        } catch (e) {
            console.error("Web Audio API is not supported by this browser.", e);
        }
    }

    private play(type: OscillatorType, frequency: number, duration: number, volume = 1, delay = 0) {
        if (!this.isInitialized || !this.audioContext || !this.masterGain) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        const startTime = this.audioContext.currentTime + delay;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);

        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    public click() {
        // Lazy initialization on first user interaction
        if (!this.isInitialized) this.initialize();
        this.play('triangle', 500, 0.08, 0.8);
    }
    
    public success() {
        if (!this.isInitialized) this.initialize();
        this.play('sine', 600, 0.1, 0.7, 0);
        this.play('sine', 800, 0.1, 0.8, 0.08);
        this.play('sine', 1000, 0.15, 0.9, 0.16);
    }

    public error() {
        if (!this.isInitialized) this.initialize();
        this.play('sawtooth', 200, 0.15, 0.7);
        this.play('sawtooth', 150, 0.15, 0.7);
    }
    
    public toggle() {
         if (!this.isInitialized) this.initialize();
         this.play('sine', 900, 0.06, 0.6);
    }
}

export const soundService = new SoundService();
