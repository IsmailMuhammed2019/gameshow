'use client';

import { useEffect } from 'react';

interface SoundEffectsProps {
  isCorrect: boolean | null;
}

export default function SoundEffects({ isCorrect }: SoundEffectsProps) {
  useEffect(() => {
    if (isCorrect === null) return;

    // Create audio context for sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    if (isCorrect) {
      // Play success sound (happy beep sequence)
      playSuccessSound(audioContext);
    } else {
      // Play failure sound (sad beep)
      playFailureSound(audioContext);
    }
  }, [isCorrect]);

  const playSuccessSound = (audioContext: AudioContext) => {
    // Create a sequence of happy beeps
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }, index * 150);
    });
  };

  const playFailureSound = (audioContext: AudioContext) => {
    // Create a sad descending sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.5); // A3
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  return null; // This component doesn't render anything
}
