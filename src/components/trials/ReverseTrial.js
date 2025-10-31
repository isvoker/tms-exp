import React, { useEffect, useRef, useState } from 'react';
import './TrialCanvas.css';
import {
  FIXATION_DURATION,
  FEEDBACK_DURATION,
  SIZES,
  COLORS
} from '../../utils/experimentConfig';

const TRIAL_STAGES = {
  FIXATION: 'fixation',
  FORWARD_MOVEMENT: 'forwardMovement',
  PAUSE_AT_END: 'pauseAtEnd',
  REVERSE_MOVEMENT: 'reverseMovement',
  WAITING_RESPONSE: 'waitingResponse',
  FEEDBACK: 'feedback'
};

function ReverseTrial({ trial, isTraining, onComplete, trajectoryGenerator, logger }) {
  const canvasRef = useRef(null);
  const [stage, setStage] = useState(TRIAL_STAGES.FIXATION);
  const [trajectory, setTrajectory] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [responsePosition, setResponsePosition] = useState(null);
  const [startPosition, setStartPosition] = useState(null);

  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const reverseStartTimeRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    console.log('=== УСЛОВИЕ: Обратный ход ===');
    console.log('Параметры:', { duration: trial.duration, speed: trial.speed });

    if (!trajectoryGenerator) {
      console.error('trajectoryGenerator не передан!');
      return;
    }

    const traj = trajectoryGenerator.generateSingleTrajectory(
      (trial.duration / 1000) * trial.speed,
      trial.trajectoryId
    );

    let finalTraj = traj;
    if (!traj || traj.length === 0) {
      console.error('Траектория пустая! Создаем резервную');
      finalTraj = [
        { x: 300, y: 300 },
        { x: 500, y: 400 },
        { x: 700, y: 500 }
      ];
    }

    console.log('Траектория готова, точек:', finalTraj.length);

    setTrajectory(finalTraj);
    setStartPosition(finalTraj[0]);

    if (logger) {
      logger.logEvent('trialStart', {
        conditionType: 'reverse',
        duration: trial.duration,
        speed: trial.speed
      });
    }
  }, []);

  // Запуск после установки траектории
  useEffect(() => {
    if (trajectory.length === 0) return;

    console.log('Запуск фиксации на', FIXATION_DURATION, 'мс');

    const fixationTimer = setTimeout(() => {
      console.log('Фиксация завершена, начинаем прямое движение');
      setStage(TRIAL_STAGES.FORWARD_MOVEMENT);
      startForwardMovement();
    }, FIXATION_DURATION);

    return () => clearTimeout(fixationTimer);
  }, [trajectory]);

  const startForwardMovement = () => {
    startTimeRef.current = performance.now();
    animateForward();
  };

  const animateForward = () => {
    // Проверяем, что траектория готова
    if (!trajectory || trajectory.length === 0) {
      animationRef.current = requestAnimationFrame(animateForward);
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
    const progress = Math.min(elapsed / trial.duration, 1);

    const trajectoryLength = trajectoryGenerator.calculateLength(trajectory);
    const currentDistance = trajectoryLength * progress;
    const position = trajectoryGenerator.getPositionAtDistance(trajectory, currentDistance);

    setCurrentPosition(position);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateForward);
    } else {
      // Достигли конца, пауза
      setStage(TRIAL_STAGES.PAUSE_AT_END);

      if (logger) {
        logger.logEvent('reachedEnd', { elapsed });
      }

      setTimeout(() => {
        setStage(TRIAL_STAGES.REVERSE_MOVEMENT);
        startReverseMovement();
      }, FIXATION_DURATION);
    }
  };

  const startReverseMovement = () => {
    reverseStartTimeRef.current = performance.now();
    stoppedRef.current = false;
    // Шарик исчезает, движение скрыто
    setCurrentPosition(null);
    animateReverse();
  };

  const animateReverse = () => {
    if (stoppedRef.current) return;

    // Проверяем, что траектория готова
    if (!trajectory || trajectory.length === 0) {
      animationRef.current = requestAnimationFrame(animateReverse);
      return;
    }

    const elapsed = performance.now() - reverseStartTimeRef.current;
    const progress = Math.min(elapsed / trial.duration, 1);

    // Движение в обратную сторону
    const trajectoryLength = trajectoryGenerator.calculateLength(trajectory);
    const currentDistance = trajectoryLength * (1 - progress);
    const position = trajectoryGenerator.getPositionAtDistance(trajectory, currentDistance);

    // Позиция скрыта, но отслеживается для точности
    setCurrentPosition(position);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateReverse);
    } else {
      // Достигли начала
      if (!stoppedRef.current) {
        handleResponse(position, elapsed);
      }
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !stoppedRef.current && stage === TRIAL_STAGES.REVERSE_MOVEMENT) {
        e.preventDefault();
        const elapsed = performance.now() - reverseStartTimeRef.current;
        handleResponse(currentPosition, elapsed);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stage, currentPosition]);

  const handleResponse = (position, elapsed) => {
    if (stoppedRef.current) return;

    stoppedRef.current = true;
    cancelAnimationFrame(animationRef.current);

    setResponsePosition(position);
    setStage(TRIAL_STAGES.WAITING_RESPONSE);

    if (logger) {
      logger.logEvent('response', {
        responseTime: elapsed,
        position: position,
        startPosition: startPosition
      });
    }

    const accuracy = calculateAccuracy(position, startPosition);

    if (isTraining) {
      setTimeout(() => {
        setStage(TRIAL_STAGES.FEEDBACK);
        setTimeout(() => {
          completeТrial(accuracy, elapsed, position);
        }, FEEDBACK_DURATION);
      }, FEEDBACK_DURATION);
    } else {
      setTimeout(() => {
        completeТrial(accuracy, elapsed, position);
      }, FEEDBACK_DURATION);
    }
  };

  const calculateAccuracy = (response, start) => {
    if (!response || !start) return 0;

    const dx = response.x - start.x;
    const dy = response.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const maxDistance = 200;
    const accuracy = Math.max(0, 1 - distance / maxDistance);

    return accuracy;
  };

  const completeТrial = (accuracy, responseTime, position) => {
    onComplete({
      accuracy,
      responseTime,
      responsePosition: position,
      startPosition,
      duration: trial.duration,
      speed: trial.speed
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawFixationStar(ctx, canvas.width / 2, canvas.height / 2);

    if (trajectory.length > 0 && stage !== TRIAL_STAGES.FIXATION) {
      drawTrajectory(ctx);
    }

    if (currentPosition && stage !== TRIAL_STAGES.REVERSE_MOVEMENT) {
      drawBall(ctx, currentPosition);
    }

    if (stage === TRIAL_STAGES.FEEDBACK && responsePosition) {
      drawFeedback(ctx, responsePosition);
    }
  }, [stage, trajectory, currentPosition, responsePosition]);

  const drawFixationStar = (ctx, x, y) => {
    ctx.fillStyle = COLORS.FIXATION_STAR;
    ctx.beginPath();
    const spikes = 5;
    const outerRadius = SIZES.FIXATION_SIZE;
    const innerRadius = SIZES.FIXATION_SIZE / 2;

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawTrajectory = (ctx) => {
    ctx.strokeStyle = COLORS.TRAJECTORY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    trajectory.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  };

  const drawBall = (ctx, position) => {
    ctx.fillStyle = COLORS.BALL;
    ctx.beginPath();
    ctx.arc(position.x, position.y, SIZES.BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawFeedback = (ctx, response) => {
    // Показываем пунктиром шарик в месте остановки
    ctx.strokeStyle = COLORS.FEEDBACK_OUTLINE;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(response.x, response.y, SIZES.BALL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Обводка вокруг фиксационной точки (начало траектории)
    if (startPosition) {
      ctx.strokeStyle = COLORS.FEEDBACK_OUTLINE;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(startPosition.x, startPosition.y, SIZES.BALL_RADIUS * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
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

export default ReverseTrial;
