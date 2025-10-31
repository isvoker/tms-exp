// Конфигурация эксперимента

export const CONDITION_TYPES = {
  TIME_TO_COLLISION: 'timeToCollision',
  CONTROL: 'control',
  REVERSE: 'reverse',
  DURATION_REPRODUCTION: 'durationReproduction'
};

export const FIXATION_DURATION = 900; // мс
export const FEEDBACK_DURATION = 900; // мс

// Длительности для разных условий
export const DURATIONS = {
  MAIN: [500, 1600, 2900], // 0.5, 1.6, 2.9 сек
  ALTERNATIVE: [500, 1400, 2500, 3900] // 0.5, 1.4, 2.5, 3.9 сек
};

// Скорости движения (точки/сек)
export const SPEEDS = [200, 400];

// Количество повторений
export const REPETITIONS = {
  TRAINING: 5,
  MAIN: 15,
  CONTROL: 10
};

// Длительности для контрольного условия
export const CONTROL_DURATIONS = [500, 1600];

// Структура эксперимента
export const EXPERIMENT_STRUCTURE = {
  TOTAL_BLOCKS: 8,
  TRIALS_PER_BLOCK_MIN: 20,
  TRIALS_PER_BLOCK_MAX: 60
};

// Размеры элементов
export const SIZES = {
  BALL_RADIUS: 10,
  TARGET_ZONE_RADIUS: 20,
  FIXATION_SIZE: 15
};

// Параметры траекторий
export const TRAJECTORY_CONFIG = {
  MIN_DISTANCE: 400, // Минимальная длина траектории в пикселях
  SEGMENTS: { MIN: 4, MAX: 5 }, // Количество сегментов
  SMOOTHING_STEPS: 5, // Количество промежуточных точек для сглаживания
  MARGIN: 100 // Отступ от краев экрана
};

// Цвета
export const COLORS = {
  BACKGROUND: '#f0f0f0',
  TRAJECTORY: '#FFD700',
  TRAJECTORY_OCCLUDED: '#D3D3D3',
  BALL: '#FF6347',
  TARGET: '#DC143C',
  FIXATION_TRIANGLE: '#FFA500',
  FIXATION_STAR: '#FFA500',
  FIXATION_CROSS: '#000000',
  FEEDBACK_OUTLINE: 'rgba(255, 99, 71, 0.5)'
};
