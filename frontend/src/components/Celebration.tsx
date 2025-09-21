'use client';

import { useEffect, useState } from 'react';

interface CelebrationProps {
  isCorrect: boolean;
  onComplete?: () => void;
}

export default function Celebration({ isCorrect, onComplete }: CelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (isCorrect !== null) {
      setShowCelebration(true);
      
      // Hide celebration after animation completes
      const timer = setTimeout(() => {
        setShowCelebration(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isCorrect, onComplete]);

  if (!showCelebration) return null;

  const createConfetti = () => {
    const confetti = [];
    for (let i = 0; i < 50; i++) {
      confetti.push(
        <div
          key={i}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      );
    }
    return confetti;
  };

  const createFireworks = () => {
    const fireworks = [];
    for (let i = 0; i < 20; i++) {
      fireworks.push(
        <div
          key={i}
          className="firework"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: ['#f97316', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)],
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      );
    }
    return fireworks;
  };

  if (isCorrect) {
    return (
      <>
        {/* Confetti */}
        <div className="celebration">
          {createConfetti()}
        </div>
        
        {/* Fireworks */}
        <div className="fireworks">
          {createFireworks()}
        </div>
        
        {/* Celebration Emoji */}
        <div className="celebration-emoji">
          🎉
        </div>
      </>
    );
  } else {
    return (
      <div className="sad-face">
        😢
      </div>
    );
  }
}
