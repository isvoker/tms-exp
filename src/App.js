import React, { useState } from 'react';
import './App.css';
import ExperimentManager from './components/ExperimentManager';
import StartScreen from './components/StartScreen';

function App() {
  const [experimentStarted, setExperimentStarted] = useState(false);
  const [participantId, setParticipantId] = useState('');

  const handleStart = (id) => {
    setParticipantId(id);
    setExperimentStarted(true);
  };

  return (
    <div className="App">
      {!experimentStarted ? (
        <StartScreen onStart={handleStart} />
      ) : (
        <ExperimentManager participantId={participantId} />
      )}
    </div>
  );
}

export default App;
