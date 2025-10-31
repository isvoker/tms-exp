import React, { useState } from 'react';
import './DurationEstimate.css';

function DurationEstimate({ blockNumber, onComplete }) {
  const [estimate, setEstimate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (estimate) {
      onComplete({
        estimatedDuration: parseInt(estimate),
        timestamp: Date.now()
      });
    }
  };

  return (
    <div className="duration-estimate">
      <div className="questionnaire-content">
        <h2>Оценка длительности блока</h2>
        <p>Сколько минут, по вашим ощущениям, длился этот блок?</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="number"
              min="1"
              max="30"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="Введите количество минут"
              autoFocus
            />
            <span className="unit">минут</span>
          </div>

          <button type="submit" disabled={!estimate}>
            Продолжить
          </button>
        </form>
      </div>
    </div>
  );
}

export default DurationEstimate;
