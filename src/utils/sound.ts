import type { AmbientSoundId } from '../types';

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Gentle Zen Chime for Timer Completion
export const playCompletionChime = (masterVolume = 0.8): void => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, now);
    masterGain.connect(ctx.destination);

    // Warm pentatonic bell chord (C5, G5, C6, E6)
    const frequencies = [523.25, 783.99, 1046.50, 1318.51];
    
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const delay = index * 0.12;
      const startTime = now + delay;
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3 / (index + 1), startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.5);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 2.6);
    });
  } catch (err) {
    console.error('Error playing completion chime:', err);
  }
};

// Subtle tick sound
export const playTickSound = (volume = 0.2): void => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.015);

    gain.gain.setValueAtTime(volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch {
    // Ignore audio context errors on auto-tick
  }
};

// Ambient Sound Synthesizer Engine
class AmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | { stop: () => void })[] = [];
  public currentTrack: AmbientSoundId = 'off';
  public currentVolume = 0.5;

  public setVolume(vol: number) {
    this.currentVolume = vol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  public getTrack(): AmbientSoundId {
    return this.currentTrack;
  }

  public getVolume(): number {
    return this.currentVolume;
  }


  public stop() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    setTimeout(() => {
      this.activeNodes.forEach(node => {
        try {
          if ('stop' in node && typeof node.stop === 'function') {
            node.stop();
          } else if ('disconnect' in node && typeof node.disconnect === 'function') {
            node.disconnect();
          }
        } catch {}
      });
      this.activeNodes = [];
      this.currentTrack = 'off';
    }, 150);
  }

  public playTrack(trackId: AmbientSoundId, volume = 0.5) {
    this.stop();
    if (trackId === 'off') return;

    this.currentTrack = trackId;
    this.currentVolume = volume;

    try {
      this.ctx = getAudioContext();
      const now = this.ctx.currentTime;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(volume, now);
      this.masterGain.connect(this.ctx.destination);

      if (trackId === 'rain') {
        this.generateRainSound();
      } else if (trackId === 'waves') {
        this.generateOceanWaves();
      } else if (trackId === 'fire') {
        this.generateFireplace();
      } else if (trackId === 'cafe') {
        this.generateCafeMurmur();
      } else if (trackId === 'lofi') {
        this.generateLofiChords();
      }
    } catch (err) {
      console.error('Failed to start ambient sound synth:', err);
    }
  }

  private createPinkNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = 5 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // scale down
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private generateRainSound() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource);
  }

  private generateOceanWaves() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    // Dynamic wave modulation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 sec wave period
    lfoGain.gain.setValueAtTime(300, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noiseSource.connect(filter);
    filter.connect(this.masterGain);

    noiseSource.start();
    lfo.start();

    this.activeNodes.push(noiseSource, lfo);
  }

  private generateFireplace() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource);
  }

  private generateCafeMurmur() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(650, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(1.5, this.ctx.currentTime);

    noiseSource.connect(bandpass);
    bandpass.connect(this.masterGain);
    noiseSource.start();

    this.activeNodes.push(noiseSource);
  }

  private generateLofiChords() {
    if (!this.ctx || !this.masterGain) return;
    const notes = [261.63, 329.63, 392.00, 493.88]; // Cmaj7 pad
    notes.forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();

      this.activeNodes.push(osc);
    });
  }
}

export const ambientEngine = new AmbientEngine();
