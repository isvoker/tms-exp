import React, { useEffect, useRef, useState } from 'react';
import './TrialCanvas.css';
import {
  FIXATION_DURATION,
  FEEDBACK_DURATION,
  SIZES,
  COLORS
} from '../../utils/experimentConfig';

const TRIAL_STAGES = {
  FIXATION_1: 'fixation1',
  STIMULUS_PRESENTATION: 'stimulusPresentation',
  FIXATION_2: 'fixation2',
  REPRODUCTION: 'reproduction',
  FIXATION_3: 'fixation3'
};

function DurationReproductionTrial({ trial, isTraining, onComplete, trajectoryGenerator, logger }) {
  const canvasRef = useRef(null);
  const [stage, setStage] = useState(TRIAL_STAGES.FIXATION_1);
  const [showStimulus, setShowStimulus] = useState(false);

  const reproductionStartTimeRef = useRef(0);
  const responseTimeRef = useRef(0);

  useEffect(() => {
    console.log('=== УСЛОВИЕ: Воспроизведение длительности ===');
    console.log('Параметры:', { targetDuration: trial.duration });

    if (logger) {
      logger.logEvent('trialStart', {
        conditionType: 'durationReproduction',
        targetDuration: trial.duration
      });
    }

    // Фаза 1: Фиксационный крест
    const fixation1Timer = setTimeout(() => {
      setStage(TRIAL_STAGES.STIMULUS_PRESENTATION);
      setShowStimulus(true);

      if (logger) {
        logger.logEvent('stimulusStart', { timestamp: performance.now() });
      }

      // Фаза 2: Предъявление стимула
      const stimulusTimer = setTimeout(() => {
        setShowStimulus(false);
        setStage(TRIAL_STAGES.FIXATION_2);

        if (logger) {
          logger.logEvent('stimulusEnd', { timestamp: performance.now() });
        }

        // Фаза 3: Фиксация после стимула
        const fixation2Timer = setTimeout(() => {
          setStage(TRIAL_STAGES.REPRODUCTION);
          setShowStimulus(true);
          reproductionStartTimeRef.current = performance.now();

          if (logger) {
            logger.logEvent('reproductionStart', { timestamp: performance.now() });
          }
        }, FIXATION_DURATION);

        return () => clearTimeout(fixation2Timer);
      }, trial.duration);

      return () => clearTimeout(stimulusTimer);
    }, FIXATION_DURATION);

    return () => clearTimeout(fixation1Timer);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && stage === TRIAL_STAGES.REPRODUCTION) {
        e.preventDefault();
        const elapsed = performance.now() - reproductionStartTimeRef.current;
        handleResponse(elapsed);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stage]);

  const handleResponse = (elapsed) => {
    responseTimeRef.current = elapsed;
    setShowStimulus(false);
    setStage(TRIAL_STAGES.FIXATION_3);

    if (logger) {
      logger.logEvent('response', {
        reproductionDuration: elapsed,
        targetDuration: trial.duration
      });
    }

    const accuracy = calculateAccuracy(elapsed, trial.duration);

    setTimeout(() => {
      completeТrial(accuracy, elapsed);
    }, FIXATION_DURATION);
  };

  const calculateAccuracy = (reproduction, target) => {
    const difference = Math.abs(reproduction - target);
    const relativeDifference = difference / target;

    // Точность от 0 до 1, где 1 = идеальное воспроизведение
    // Допустимая погрешность 50%
    const accuracy = Math.max(0, 1 - relativeDifference / 0.5);

    return accuracy;
  };

  const completeТrial = (accuracy, reproductionTime) => {
    onComplete({
      accuracy,
      targetDuration: trial.duration,
      reproductionDuration: reproductionTime,
      difference: reproductionTime - trial.duration
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Рисуем фиксационный крест
    if (
      stage === TRIAL_STAGES.FIXATION_1 ||
      stage === TRIAL_STAGES.FIXATION_2 ||
      stage === TRIAL_STAGES.FIXATION_3
    ) {
      drawFixationCross(ctx, centerX, centerY);
    }

    // Рисуем стимул (шарик)
    if (showStimulus) {
      drawStimulus(ctx, centerX, centerY);
    }
  }, [stage, showStimulus]);

  const drawFixationCross = (ctx, x, y) => {
    ctx.strokeStyle = COLORS.FIXATION_CROSS;
    ctx.lineWidth = 3;

    // Горизонтальная линия
    ctx.beginPath();
    ctx.moveTo(x - SIZES.FIXATION_SIZE, y);
    ctx.lineTo(x + SIZES.FIXATION_SIZE, y);
    ctx.stroke();

    // Вертикальная линия
    ctx.beginPath();
    ctx.moveTo(x, y - SIZES.FIXATION_SIZE);
    ctx.lineTo(x, y + SIZES.FIXATION_SIZE);
    ctx.stroke();
  };

  const drawStimulus = (ctx, x, y) => {
    ctx.fillStyle = COLORS.BALL;
    ctx.beginPath();
    ctx.arc(x, y, SIZES.BALL_RADIUS * 2, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div className="trial-canvas-container">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="trial-canvas"
      />
    </div>
  );
}

export default DurationReproductionTrial;
