import React, { useEffect } from 'react';
import './InterTrialScreen.css';

function InterTrialScreen({ onReady }) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onReady();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onReady]);

  return (
    <div className="inter-trial-screen">
      <p>Нажмите клавишу <strong>ПРОБЕЛ</strong> чтобы продолжить</p>
    </div>
  );
}

export default InterTrialScreen;
