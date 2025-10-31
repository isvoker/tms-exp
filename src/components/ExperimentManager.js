import React, { useState, useEffect, useRef } from 'react';
import './ExperimentManager.css';
import { ExperimentLogger } from '../utils/logger';
import { TrialGenerator } from '../utils/trialGenerator';
import { TrajectoryGenerator } from '../utils/trajectoryGenerator';
import { CONDITION_TYPES, EXPERIMENT_STRUCTURE } from '../utils/experimentConfig';

import TimeToCollisionTrial from './trials/TimeToCollisionTrial';
import ControlTrial from './trials/ControlTrial';
import ReverseTrial from './trials/ReverseTrial';
import DurationReproductionTrial from './trials/DurationReproductionTrial';
import BlockSummary from './BlockSummary';
import InstructionScreen from './InstructionScreen';
import InterTrialScreen from './InterTrialScreen';

const EXPERIMENT_STATES = {
  INSTRUCTION: 'instruction',
  INTER_TRIAL: 'interTrial',
  TRIAL: 'trial',
  BLOCK_SUMMARY: 'blockSummary',
  FINISHED: 'finished'
};

function ExperimentManager({ participantId }) {
  const [state, setState] = useState(EXPERIMENT_STATES.INSTRUCTION);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [trajectories, setTrajectories] = useState({});
  const [blockScores, setBlockScores] = useState([]);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [isTraining, setIsTraining] = useState(true);

  const loggerRef = useRef(null);
  const trialGeneratorRef = useRef(null);
  const trajectoryGeneratorRef = useRef(null);

  // Инициализация эксперимента
  useEffect(() => {
    // Создаем логгер
    loggerRef.current = new ExperimentLogger(participantId);

    // Создаем генератор трайлов
    trialGeneratorRef.current = new TrialGenerator();

    // Создаем генератор траекторий (размеры экрана)
    trajectoryGeneratorRef.current = new TrajectoryGenerator(
      window.innerWidth,
      window.innerHeight,
      window.innerWidth / 2,
      window.innerHeight / 2
    );

    // Генерируем все трайлы
    const trainingTrials = trialGeneratorRef.current.generateTrainingTrials();
    const mainTrials = trialGeneratorRef.current.generateMainTrials();

    // Разбиваем основные трайлы на блоки
    const mainBlocks = trialGeneratorRef.current.splitIntoBlocks(
      mainTrials,
      EXPERIMENT_STRUCTURE.TOTAL_BLOCKS
    );

    // Добавляем тренировочный блок в начало
    const allBlocks = [[...trainingTrials], ...mainBlocks];
    setBlocks(allBlocks);

    // Инициализируем первый трайл
    if (allBlocks.length > 0 && allBlocks[0].length > 0) {
      setCurrentTrial(allBlocks[0][0]);
    }

    console.log('Эксперимент инициализирован:', {
      participantId,
      totalBlocks: allBlocks.length,
      totalTrials: trainingTrials.length + mainTrials.length
    });
  }, [participantId]);

  // Обработчик начала эксперимента
  const handleStartExperiment = () => {
    setState(EXPERIMENT_STATES.INTER_TRIAL);
  };

  // Обработчик готовности к трайлу
  const handleReadyForTrial = () => {
    setState(EXPERIMENT_STATES.TRIAL);
  };

  // Обработчик завершения трайла
  const handleTrialComplete = (response) => {
    // Логируем результат
    if (loggerRef.current && currentTrial) {
      loggerRef.current.startTrial({
        blockNumber: currentBlockIndex + 1,
        trialNumber: currentTrialIndex + 1,
        ...currentTrial
      });

      loggerRef.current.endTrial(response);
    }

    // Переходим к следующему трайлу
    const nextTrialIndex = currentTrialIndex + 1;

    if (nextTrialIndex < blocks[currentBlockIndex].length) {
      // Еще есть трайлы в текущем блоке
      setCurrentTrialIndex(nextTrialIndex);
      setCurrentTrial(blocks[currentBlockIndex][nextTrialIndex]);
      setState(EXPERIMENT_STATES.INTER_TRIAL);
    } else {
      // Блок завершен
      setState(EXPERIMENT_STATES.BLOCK_SUMMARY);
    }
  };

  // Обработчик завершения блока
  const handleBlockComplete = (blockData) => {
    setBlockScores([...blockScores, blockData]);

    // Сохраняем метаданные блока
    if (loggerRef.current) {
      loggerRef.current.addBlockMetadata(currentBlockIndex + 1, blockData);
      // Сохраняем данные после каждого блока
      loggerRef.current.saveToFile();
    }

    const nextBlockIndex = currentBlockIndex + 1;

    if (nextBlockIndex < blocks.length) {
      // Переходим к следующему блоку
      setCurrentBlockIndex(nextBlockIndex);
      setCurrentTrialIndex(0);
      setCurrentTrial(blocks[nextBlockIndex][0]);

      // После тренировочного блока переходим в основную часть
      if (currentBlockIndex === 0) {
        setIsTraining(false);
      }

      setState(EXPERIMENT_STATES.INSTRUCTION);
    } else {
      // Эксперимент завершен
      if (loggerRef.current) {
        loggerRef.current.saveToFile();
      }
      setState(EXPERIMENT_STATES.FINISHED);
    }
  };

  // Обработчик досрочного завершения эксперимента
  const handleTerminateExperiment = () => {
    const confirmTerminate = window.confirm(
      'Вы уверены, что хотите завершить эксперимент?\nВсе текущие данные будут сохранены.'
    );

    if (confirmTerminate) {
      // Сохраняем текущее состояние
      if (loggerRef.current) {
        loggerRef.current.addBlockMetadata(currentBlockIndex + 1, {
          terminated: true,
          terminatedAt: Date.now(),
          completedTrials: currentTrialIndex
        });
        loggerRef.current.saveToFile();
      }
      setState(EXPERIMENT_STATES.FINISHED);
    }
  };

  // Обработчик сохранения результатов с выбором места
  const handleSaveResults = async () => {
    if (loggerRef.current) {
      const filepath = await loggerRef.current.saveToFileWithDialog();
      if (filepath) {
        alert(`Результаты успешно сохранены:\n${filepath}`);
      }
    }
  };

  // Рендер текущего состояния
  const renderCurrentState = () => {
    switch (state) {
      case EXPERIMENT_STATES.INSTRUCTION:
        return (
          <InstructionScreen
            blockNumber={currentBlockIndex + 1}
            isTraining={currentBlockIndex === 0}
            currentTrial={currentTrial}
            onStart={handleStartExperiment}
          />
        );

      case EXPERIMENT_STATES.INTER_TRIAL:
        return (
          <InterTrialScreen onReady={handleReadyForTrial} />
        );

      case EXPERIMENT_STATES.TRIAL:
        return renderTrial();

      case EXPERIMENT_STATES.BLOCK_SUMMARY:
        return (
          <BlockSummary
            blockNumber={currentBlockIndex + 1}
            isTraining={currentBlockIndex === 0}
            trials={blocks[currentBlockIndex]}
            logger={loggerRef.current}
            onContinue={handleBlockComplete}
          />
        );

      case EXPERIMENT_STATES.FINISHED:
        return (
          <div className="finished-screen">
            <h1>Эксперимент завершен!</h1>
            <p>Спасибо за участие!</p>
            <p>Результаты автоматически сохранены в папку приложения.</p>
            <button
              className="save-results-button"
              onClick={handleSaveResults}
            >
              Получить результаты
            </button>
            <p className="save-results-hint">
              Нажмите кнопку выше, чтобы сохранить результаты в выбранное место
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // Рендер конкретного типа трайла
  const renderTrial = () => {
    if (!currentTrial) return null;

    const commonProps = {
      trial: currentTrial,
      isTraining: currentBlockIndex === 0,
      onComplete: handleTrialComplete,
      trajectoryGenerator: trajectoryGeneratorRef.current,
      logger: loggerRef.current
    };

    switch (currentTrial.conditionType) {
      case CONDITION_TYPES.TIME_TO_COLLISION:
        return <TimeToCollisionTrial {...commonProps} />;

      case CONDITION_TYPES.CONTROL:
        return <ControlTrial {...commonProps} />;

      case CONDITION_TYPES.REVERSE:
        return <ReverseTrial {...commonProps} />;

      case CONDITION_TYPES.DURATION_REPRODUCTION:
        return <DurationReproductionTrial {...commonProps} />;

      default:
        return <div>Неизвестный тип условия</div>;
    }
  };

  return (
    <div className="experiment-manager">
      {state !== EXPERIMENT_STATES.FINISHED && (
        <button
          className="terminate-button"
          onClick={handleTerminateExperiment}
        >
          Завершить эксперимент
        </button>
      )}
      {renderCurrentState()}
    </div>
  );
}

export default ExperimentManager;
