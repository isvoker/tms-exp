import React, { useState, useEffect } from 'react';
import './BlockSummary.css';
import DurationEstimate from './questionnaires/DurationEstimate';
import SANQuestionnaire from './questionnaires/SANQuestionnaire';

function BlockSummary({ blockNumber, isTraining, trials, logger, onContinue }) {
  const [showDuration, setShowDuration] = useState(true);
  const [showSAN, setShowSAN] = useState(false);
  const [durationEstimate, setDurationEstimate] = useState(null);
  const [sanResults, setSanResults] = useState(null);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    // Вычисляем средний балл точности
    calculateAccuracy();
  }, []);

  const calculateAccuracy = () => {
    if (!logger || !logger.logs.length) {
      setAccuracy(0);
      return;
    }

    // Берем логи текущего блока
    const blockLogs = logger.logs.filter(
      log => log.blockNumber === blockNumber
    );

    if (blockLogs.length === 0) {
      setAccuracy(0);
      return;
    }

    // Вычисляем среднюю точность
    const totalAccuracy = blockLogs.reduce((sum, log) => {
      if (log.response && log.response.accuracy !== undefined) {
        return sum + log.response.accuracy;
      }
      return sum;
    }, 0);

    const avgAccuracy = (totalAccuracy / blockLogs.length) * 100;
    setAccuracy(Math.round(avgAccuracy));
  };

  const handleDurationComplete = (estimate) => {
    setDurationEstimate(estimate);
    setShowDuration(false);
    setShowSAN(true);
  };

  const handleSANComplete = (results) => {
    setSanResults(results);
    setShowSAN(false);

    // Передаем все данные блока
    onContinue({
      accuracy,
      durationEstimate,
      sanResults: results,
      timestamp: Date.now()
    });
  };

  return (
    <div className="block-summary">
      {showDuration && (
        <DurationEstimate
          blockNumber={blockNumber}
          onComplete={handleDurationComplete}
        />
      )}

      {showSAN && (
        <SANQuestionnaire
          blockNumber={blockNumber}
          onComplete={handleSANComplete}
        />
      )}

      {!showDuration && !showSAN && (
        <div className="summary-content">
          <h1>
            {isTraining ? 'Тренировочный блок завершен' : `Блок ${blockNumber - 1} завершен`}
          </h1>
          <div className="score-display">
            <h2>Ваш результат</h2>
            <div className="score-value">{accuracy}%</div>
            <p>Средняя точность ответов</p>
          </div>
          <div className="continue-prompt">
            <p>Обработка данных...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlockSummary;
