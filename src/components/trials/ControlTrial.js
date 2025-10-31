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
  MOVEMENT: 'movement',
  WAITING_RESPONSE: 'waitingResponse',
  FEEDBACK: 'feedback'
};

function ControlTrial({ trial, isTraining, onComplete, trajectoryGenerator, logger }) {
  const canvasRef = useRef(null);
  const [stage, setStage] = useState(TRIAL_STAGES.FIXATION);
  const [trajectory, setTrajectory] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [responsePosition, setResponsePosition] = useState(null);
  const [targetPosition, setTargetPosition] = useState(null);

  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    console.log('=== УСЛОВИЕ: Контрольное (без окклюдера) ===');
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
    setTargetPosition(finalTraj[finalTraj.length - 1]);

    if (logger) {
      logger.logEvent('trialStart', {
        conditionType: 'control',
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
      console.log('Фиксация завершена, начинаем движение');
      setStage(TRIAL_STAGES.MOVEMENT);
      startMovement();
    }, FIXATION_DURATION);

    return () => clearTimeout(fixationTimer);
  }, [trajectory]);

  const startMovement = () => {
    startTimeRef.current = performance.now();
    stoppedRef.current = false;
    animate();
  };

  const animate = () => {
    if (stoppedRef.current) return;

    // Проверяем, что траектория готова
    if (!trajectory || trajectory.length === 0) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
    const progress = Math.min(elapsed / trial.duration, 1);

    const trajectoryLength = trajectoryGenerator.calculateLength(trajectory);
    const currentDistance = trajectoryLength * progress;
    const position = trajectoryGenerator.getPositionAtDistance(trajectory, currentDistance);

    setCurrentPosition(position);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (!stoppedRef.current) {
        handleResponse(position, elapsed);
      }
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !stoppedRef.current && stage === TRIAL_STAGES.MOVEMENT) {
        e.preventDefault();
        const elapsed = performance.now() - startTimeRef.current;
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
        targetPosition: targetPosition
      });
    }

    const accuracy = calculateAccuracy(position, targetPosition);

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

  const calculateAccuracy = (response, target) => {
    if (!response || !target) return 0;

    const dx = response.x - target.x;
    const dy = response.y - target.y;
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
      targetPosition,
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

    drawFixationTriangle(ctx, canvas.width / 2, canvas.height / 2);

    if (trajectory.length > 0 && stage !== TRIAL_STAGES.FIXATION) {
      drawTrajectory(ctx);
    }

    if (targetPosition && stage !== TRIAL_STAGES.FIXATION) {
      drawTargetZone(ctx, targetPosition);
    }

    if (currentPosition && stage === TRIAL_STAGES.MOVEMENT) {
      drawBall(ctx, currentPosition);
    }

    if (stage === TRIAL_STAGES.FEEDBACK && responsePosition) {
      drawFeedback(ctx, responsePosition);
    }
  }, [stage, trajectory, currentPosition, targetPosition, responsePosition]);

  const drawFixationTriangle = (ctx, x, y) => {
    ctx.fillStyle = COLORS.FIXATION_TRIANGLE;
    ctx.beginPath();
    ctx.moveTo(x, y - SIZES.FIXATION_SIZE);
    ctx.lineTo(x - SIZES.FIXATION_SIZE, y + SIZES.FIXATION_SIZE);
    ctx.lineTo(x + SIZES.FIXATION_SIZE, y + SIZES.FIXATION_SIZE);
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

    if (trajectory[0]) {
      ctx.fillStyle = COLORS.BALL;
      ctx.beginPath();
      ctx.arc(trajectory[0].x, trajectory[0].y, SIZES.BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawTargetZone = (ctx, target) => {
    ctx.fillStyle = COLORS.TARGET;
    ctx.beginPath();
    ctx.arc(target.x, target.y, SIZES.TARGET_ZONE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBall = (ctx, position) => {
    ctx.fillStyle = COLORS.BALL;
    ctx.beginPath();
    ctx.arc(position.x, position.y, SIZES.BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawFeedback = (ctx, response) => {
    ctx.strokeStyle = COLORS.FEEDBACK_OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(response.x, response.y, SIZES.BALL_RADIUS * 2, 0, Math.PI * 2);
    ctx.stroke();

    drawBall(ctx, response);
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

export default ControlTrial;
