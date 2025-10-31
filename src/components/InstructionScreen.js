import React, { useEffect } from 'react';
import './InstructionScreen.css';
import { TrialGenerator } from '../utils/trialGenerator';

function InstructionScreen({ blockNumber, isTraining, currentTrial, onStart }) {
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onStart]);

  const getInstruction = () => {
    if (!currentTrial) return '';
    return TrialGenerator.getInstructionForCondition(currentTrial.conditionType, isTraining);
  };

  return (
    <div className="instruction-screen">
      <div className="instruction-content">
        {isTraining ? (
          <>
            <h1>Тренировочный блок</h1>
            <p className="block-info">
              В этом блоке вы познакомитесь со всеми типами заданий.
              <br />
              После каждой попытки будет показана обратная связь.
            </p>
          </>
        ) : (
          <>
            <h1>Блок {blockNumber - 1} из 8</h1>
            <p className="block-info">
              Основная часть эксперимента.
              <br />
              Обратная связь не предоставляется.
            </p>
          </>
        )}

        <div
          className="condition-instruction"
          dangerouslySetInnerHTML={{ __html: getInstruction() }}
        />

        <div className="start-prompt">
          <p>Нажмите <strong>ПРОБЕЛ</strong>, чтобы начать</p>
        </div>
      </div>
    </div>
  );
}

export default InstructionScreen;
