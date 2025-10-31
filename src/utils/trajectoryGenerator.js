// Генератор траекторий
import { TRAJECTORY_CONFIG } from './experimentConfig';

export class TrajectoryGenerator {
  constructor(canvasWidth, canvasHeight, centerX, centerY) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.centerX = centerX;
    this.centerY = centerY;
    this.margin = TRAJECTORY_CONFIG.MARGIN;
  }

  // Генерация библиотеки траекторий для каждой длительности
  generateTrajectoryLibrary(duration, speed) {
    const trajectories = [];
    const totalDistance = (duration / 1000) * speed;

    // Генерируем 5 траекторий для каждой длительности
    for (let i = 0; i < 5; i++) {
      const trajectory = this.generateSingleTrajectory(totalDistance, i);
      trajectories.push(trajectory);
    }

    return trajectories;
  }

  generateSingleTrajectory(totalDistance, seed) {
    const points = [];

    // Увеличиваем минимальную дистанцию для видимых траекторий
    const minDistance = Math.max(totalDistance, TRAJECTORY_CONFIG.MIN_DISTANCE);
    const segmentRange = TRAJECTORY_CONFIG.SEGMENTS.MAX - TRAJECTORY_CONFIG.SEGMENTS.MIN;
    const numSegments = TRAJECTORY_CONFIG.SEGMENTS.MIN + (seed % (segmentRange + 1));
    const segmentLength = minDistance / numSegments;

    // Начальная точка - в случайном квадранте экрана
    const quadrant = seed % 4;
    let startX, startY;

    switch (quadrant) {
      case 0: // Левая верхняя четверть
        startX = this.margin + Math.random() * (this.canvasWidth / 3);
        startY = this.margin + Math.random() * (this.canvasHeight / 3);
        break;
      case 1: // Правая верхняя четверть
        startX = this.canvasWidth * 2/3 + Math.random() * (this.canvasWidth / 3 - this.margin);
        startY = this.margin + Math.random() * (this.canvasHeight / 3);
        break;
      case 2: // Левая нижняя четверть
        startX = this.margin + Math.random() * (this.canvasWidth / 3);
        startY = this.canvasHeight * 2/3 + Math.random() * (this.canvasHeight / 3 - this.margin);
        break;
      case 3: // Правая нижняя четверть
        startX = this.canvasWidth * 2/3 + Math.random() * (this.canvasWidth / 3 - this.margin);
        startY = this.canvasHeight * 2/3 + Math.random() * (this.canvasHeight / 3 - this.margin);
        break;
    }

    points.push({ x: startX, y: startY });

    // Генерируем траекторию с гарантией непрерывности
    let currentX = startX;
    let currentY = startY;
    let currentAngle = (seed * 45) % 360; // Начальный угол

    for (let i = 0; i < numSegments; i++) {
      // Изменяем угол плавно (от -45 до +45 градусов)
      const angleChange = (Math.random() - 0.5) * 90;
      currentAngle = currentAngle + angleChange;

      const angleRad = (currentAngle * Math.PI) / 180;
      let nextX = currentX + Math.cos(angleRad) * segmentLength;
      let nextY = currentY + Math.sin(angleRad) * segmentLength;

      // Отражаем от границ вместо обрезки
      if (nextX < this.margin) {
        nextX = this.margin + (this.margin - nextX);
        currentAngle = 180 - currentAngle; // Отражение
      }
      if (nextX > this.canvasWidth - this.margin) {
        nextX = (this.canvasWidth - this.margin) - (nextX - (this.canvasWidth - this.margin));
        currentAngle = 180 - currentAngle;
      }
      if (nextY < this.margin) {
        nextY = this.margin + (this.margin - nextY);
        currentAngle = -currentAngle; // Отражение
      }
      if (nextY > this.canvasHeight - this.margin) {
        nextY = (this.canvasHeight - this.margin) - (nextY - (this.canvasHeight - this.margin));
        currentAngle = -currentAngle;
      }

      currentX = nextX;
      currentY = nextY;
      points.push({ x: currentX, y: currentY });
    }

    return this.smoothTrajectory(points);
  }

  // Сглаживание траектории для более плавных линий
  smoothTrajectory(points) {
    if (!points || points.length === 0) {
      console.error('smoothTrajectory: пустой массив точек!');
      return [{ x: 100, y: 100 }, { x: 200, y: 200 }]; // Возвращаем минимальную траекторию
    }

    if (points.length < 2) {
      return points;
    }

    // Создаем плавную кривую через все точки
    const smoothed = [points[0]];

    // Добавляем промежуточные точки между каждой парой
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Используем Catmull-Rom сплайн для плавности
      const steps = TRAJECTORY_CONFIG.SMOOTHING_STEPS;
      for (let t = 0; t <= steps; t++) {
        const u = t / steps;
        const u2 = u * u;
        const u3 = u2 * u;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * u +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3
        );

        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * u +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3
        );

        if (t > 0) { // Пропускаем первую точку (она уже добавлена)
          smoothed.push({ x, y });
        }
      }
    }

    smoothed.push(points[points.length - 1]);

    return smoothed;
  }

  // Вычисление длины траектории
  calculateLength(points) {
    if (!points || points.length < 2) {
      return 0;
    }

    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  // Получение позиции на траектории по пройденному расстоянию
  getPositionAtDistance(points, distance) {
    // Проверка на пустой массив или недостаточное количество точек
    if (!points || points.length === 0) {
      return { x: 0, y: 0, index: 0 };
    }

    if (points.length === 1) {
      return { x: points[0].x, y: points[0].y, index: 0 };
    }

    let accumulated = 0;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (accumulated + segmentLength >= distance) {
        const ratio = (distance - accumulated) / segmentLength;
        return {
          x: points[i - 1].x + dx * ratio,
          y: points[i - 1].y + dy * ratio,
          index: i
        };
      }

      accumulated += segmentLength;
    }

    // Вернуть последнюю точку, если расстояние превышает длину траектории
    return {
      x: points[points.length - 1].x,
      y: points[points.length - 1].y,
      index: points.length - 1
    };
  }
}

// Предгенерированные траектории будут храниться здесь
export const TRAJECTORY_LIBRARY = {};
