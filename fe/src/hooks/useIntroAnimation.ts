import { useState, useEffect } from 'react';

export const useIntroAnimation = (duration: number = 1500) => {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return { showIntro };
};
