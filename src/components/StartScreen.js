import React, { useState } from 'react';
import './StartScreen.css';

function StartScreen({ onStart }) {
  const [participantId, setParticipantId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (participantId.trim()) {
      onStart(participantId.trim());
    }
  };

  return (
    <div className="start-screen">
      <div className="start-container">
        <h1>Эксперимент по исследованию восприятия времени и движения</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="participant-id">Введите ID участника:</label>
            <input
              type="text"
              id="participant-id"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="Например: P001"
              autoFocus
            />
          </div>
          <button type="submit" disabled={!participantId.trim()}>
            Начать эксперимент
          </button>
        </form>
      </div>
    </div>
  );
}

export default StartScreen;
