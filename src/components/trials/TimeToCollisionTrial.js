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
  MOVEMENT_VISIBLE: 'movementVisible',
  MOVEMENT_OCCLUDED: 'movementOccluded',
  WAITING_RESPONSE: 'waitingResponse',
  FEEDBACK: 'feedback',
  INTER_TRIAL_PAUSE: 'interTrialPause'
};

function TimeToCollisionTrial({ trial, isTraining, onComplete, trajectoryGenerator, logger }) {
  const canvasRef = useRef(null);
  const [stage, setStage] = useState(TRIAL_STAGES.FIXATION);
  const [trajectory, setTrajectory] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [responsePosition, setResponsePosition] = useState(null);
  const [targetPosition, setTargetPosition] = useState(null);
  const [occluderStartIndex, setOccluderStartIndex] = useState(0);

  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const responseTimeRef = useRef(0);
  const stoppedRef = useRef(false);

  // Инициализация трайла
  useEffect(() => {
    console.log('=== УСЛОВИЕ: Time to Collision (с окклюдером) ===');
    console.log('Параметры:', { duration: trial.duration, speed: trial.speed });

    if (!trajectoryGenerator) {
      console.error('trajectoryGenerator не передан!');
      return;
    }

    const totalDistance = (trial.duration / 1000) * trial.speed * 2;

    const traj = trajectoryGenerator.generateSingleTrajectory(
      totalDistance, // полная длина траектории
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

    // Окклюдер начинается на половине пути
    setOccluderStartIndex(Math.floor(finalTraj.length / 2));

    // Логируем начало трайла
    if (logger) {
      logger.logEvent('trialStart', {
        conditionType: 'timeToCollision',
        duration: trial.duration,
        speed: trial.speed
      });
    }
  }, []);

  // Запуск фиксации и анимации после того, как траектория установлена
  useEffect(() => {
    if (trajectory.length === 0) return;

    console.log('Запуск фиксации на', FIXATION_DURATION, 'мс');

    // Начинаем с фиксации
    const fixationTimer = setTimeout(() => {
      console.log('Фиксация завершена, начинаем движение');
      setStage(TRIAL_STAGES.MOVEMENT_VISIBLE);
      startMovement();
    }, FIXATION_DURATION);

    return () => clearTimeout(fixationTimer);
  }, [trajectory]);

  // Запуск движения
  const startMovement = () => {
    startTimeRef.current = performance.now();
    stoppedRef.current = false;
    animate();
  };

  // Анимация движения
  const animate = () => {
    if (stoppedRef.current) return;

    // Проверяем, что траектория готова
    if (!trajectory || trajectory.length === 0) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const elapsed = performance.now() - startTimeRef.current;
    const totalDuration = trial.duration * 2; // полная длительность (видимая + скрытая часть)
    const progress = Math.min(elapsed / totalDuration, 1);

    // Вычисляем позицию на траектории
    const trajectoryLength = trajectoryGenerator.calculateLength(trajectory);
    const currentDistance = trajectoryLength * progress;
    const position = trajectoryGenerator.getPositionAtDistance(trajectory, currentDistance);

    setCurrentPosition(position);

    // Проверяем, нужно ли переключить стадию
    if (progress >= 0.5 && stage === TRIAL_STAGES.MOVEMENT_VISIBLE) {
      setStage(TRIAL_STAGES.MOVEMENT_OCCLUDED);
      if (logger) {
        logger.logEvent('occluderStart', { elapsed });
      }
    }

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Движение закончилось, но ответа не было
      if (!stoppedRef.current) {
        handleResponse(position, elapsed);
      }
    }
  };

  // Обработка нажатия пробела
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' && !stoppedRef.current) {
        e.preventDefault();
        const elapsed = performance.now() - startTimeRef.current;
        handleResponse(currentPosition, elapsed);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [stage, currentPosition]);

  // Обработка ответа
  const handleResponse = (position, elapsed) => {
    if (stoppedRef.current) return;

    stoppedRef.current = true;
    cancelAnimationFrame(animationRef.current);
    responseTimeRef.current = elapsed;

    setResponsePosition(position);
    setStage(TRIAL_STAGES.WAITING_RESPONSE);

    if (logger) {
      logger.logEvent('response', {
        responseTime: elapsed,
        position: position,
        targetPosition: targetPosition
      });
    }

    // Вычисляем точность
    const accuracy = calculateAccuracy(position, targetPosition);

    // Показываем обратную связь (только в тренировке)
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

  // Вычисление точности
  const calculateAccuracy = (response, target) => {
    if (!response || !target) return 0;

    const dx = response.x - target.x;
    const dy = response.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Точность от 0 до 1, где 1 = точное попадание
    const maxDistance = 200; // максимальная допустимая ошибка
    const accuracy = Math.max(0, 1 - distance / maxDistance);

    return accuracy;
  };

  // Завершение трайла
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

  // Рисование на canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Фон
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Фиксационная точка (треугольник)
    drawFixationTriangle(ctx, canvas.width / 2, canvas.height / 2);

    // Траектория (только видимая часть)
    if (trajectory.length > 0 && stage !== TRIAL_STAGES.FIXATION) {
      drawTrajectory(ctx);
    }

    // Целевая зона
    if (targetPosition && stage !== TRIAL_STAGES.FIXATION) {
      drawTargetZone(ctx, targetPosition);
    }

    // Шарик
    if (currentPosition && stage === TRIAL_STAGES.MOVEMENT_VISIBLE) {
      drawBall(ctx, currentPosition);
    }

    // Обратная связь
    if (stage === TRIAL_STAGES.FEEDBACK && responsePosition) {
      drawFeedback(ctx, responsePosition);
    }
  }, [stage, trajectory, currentPosition, targetPosition, responsePosition]);

  // Функции рисования
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
    // Видимая часть (до окклюдера)
    ctx.strokeStyle = COLORS.TRAJECTORY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < Math.min(occluderStartIndex, trajectory.length); i++) {
      const point = trajectory[i];
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();

    // Скрытая часть (за окклюдером) - серая
    ctx.strokeStyle = COLORS.TRAJECTORY_OCCLUDED;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = occluderStartIndex; i < trajectory.length; i++) {
      const point = trajectory[i];
      if (i === occluderStartIndex) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();

    // Стартовая позиция
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
    // Обводка в месте остановки
    ctx.strokeStyle = COLORS.FEEDBACK_OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(response.x, response.y, SIZES.BALL_RADIUS * 2, 0, Math.PI * 2);
    ctx.stroke();

    // Показываем шарик
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

export default TimeToCollisionTrial;
