import {
  CONDITION_TYPES,
  DURATIONS,
  SPEEDS,
  REPETITIONS,
  CONTROL_DURATIONS
} from './experimentConfig';

// Утилита для перемешивания массива (алгоритм Фишера-Йейтса)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Генератор трайлов для эксперимента
export class TrialGenerator {
  constructor() {
    this.trialCounter = 0;
  }

  // Генерация всех трайлов для тренировочного блока
  generateTrainingTrials() {
    const trials = [];
    const conditions = [
      CONDITION_TYPES.TIME_TO_COLLISION,
      CONDITION_TYPES.CONTROL,
      CONDITION_TYPES.REVERSE,
      CONDITION_TYPES.DURATION_REPRODUCTION
    ];

    // 5 повторений * 3 длительности * 4 условия = 60 трайлов
    for (let rep = 0; rep < REPETITIONS.TRAINING; rep++) {
      for (const duration of DURATIONS.MAIN) {
        for (const condition of conditions) {
          // Условия с движением имеют скорость
          if (condition !== CONDITION_TYPES.DURATION_REPRODUCTION) {
            for (const speed of SPEEDS) {
              trials.push(this.createTrial(condition, duration, speed, true));
            }
          } else {
            trials.push(this.createTrial(condition, duration, null, true));
          }
        }
      }
    }

    return shuffleArray(trials);
  }

  // Генерация всех трайлов для основной части
  generateMainTrials() {
    const trials = [];

    // Условия с движением и окклюдером
    const movementConditions = [
      CONDITION_TYPES.TIME_TO_COLLISION,
      CONDITION_TYPES.REVERSE
    ];

    // 15 повторений * 3 длительности * 2 условия * 2 скорости
    for (let rep = 0; rep < REPETITIONS.MAIN; rep++) {
      for (const duration of DURATIONS.MAIN) {
        for (const condition of movementConditions) {
          for (const speed of SPEEDS) {
            trials.push(this.createTrial(condition, duration, speed, false));
          }
        }
      }
    }

    // Контрольное условие (без окклюдера)
    // 10 повторений * 2 длительности (0.5 и 1.6 сек) * 2 скорости
    for (let rep = 0; rep < REPETITIONS.CONTROL; rep++) {
      for (const duration of CONTROL_DURATIONS) {
        for (const speed of SPEEDS) {
          trials.push(this.createTrial(CONDITION_TYPES.CONTROL, duration, speed, false));
        }
      }
    }

    // Условие воспроизведения длительности
    // 15 повторений * 3 длительности
    for (let rep = 0; rep < REPETITIONS.MAIN; rep++) {
      for (const duration of DURATIONS.MAIN) {
        trials.push(this.createTrial(CONDITION_TYPES.DURATION_REPRODUCTION, duration, null, false));
      }
    }

    return shuffleArray(trials);
  }

  // Создание одного трайла
  createTrial(conditionType, duration, speed, isTraining) {
    this.trialCounter++;

    return {
      trialId: this.trialCounter,
      conditionType,
      duration,
      speed,
      isTraining,
      trajectoryId: Math.floor(Math.random() * 5), // выбор одной из 5 траекторий
      timestamp: Date.now()
    };
  }

  // Разделение трайлов на блоки
  splitIntoBlocks(trials, numBlocks = 8) {
    const trialsPerBlock = Math.ceil(trials.length / numBlocks);
    const blocks = [];

    for (let i = 0; i < numBlocks; i++) {
      const start = i * trialsPerBlock;
      const end = Math.min(start + trialsPerBlock, trials.length);
      blocks.push(trials.slice(start, end));
    }

    return blocks;
  }

  // Получение инструкции для условия
  static getInstructionForCondition(conditionType, isTraining) {
    const instructions = {
      [CONDITION_TYPES.TIME_TO_COLLISION]: `
        <h2>Условие: Предсказание движения</h2>
        <p>Вы увидите шарик, движущийся по траектории. Часть пути будет скрыта.</p>
        <p><strong>Задача:</strong> Нажмите ПРОБЕЛ, чтобы остановить шарик как можно ближе к целевой зоне (красный круг).</p>
        ${isTraining ? '<p><em>Это тренировка. Вы увидите обратную связь после каждой попытки.</em></p>' : ''}
      `,
      [CONDITION_TYPES.CONTROL]: `
        <h2>Условие: Контрольное</h2>
        <p>Вы увидите шарик, движущийся по всей траектории без скрытых участков.</p>
        <p><strong>Задача:</strong> Нажмите ПРОБЕЛ, чтобы остановить шарик как можно ближе к целевой зоне (красный круг).</p>
        ${isTraining ? '<p><em>Это тренировка. Вы увидите обратную связь после каждой попытки.</em></p>' : ''}
      `,
      [CONDITION_TYPES.REVERSE]: `
        <h2>Условие: Обратный ход</h2>
        <p>Сначала вы увидите, как шарик движется до конца траектории.</p>
        <p>Затем шарик исчезнет и начнет двигаться назад (скрыто).</p>
        <p><strong>Задача:</strong> Нажмите ПРОБЕЛ в момент, когда шарик достигнет начала траектории.</p>
        ${isTraining ? '<p><em>Это тренировка. Вы увидите обратную связь после каждой попытки.</em></p>' : ''}
      `,
      [CONDITION_TYPES.DURATION_REPRODUCTION]: `
        <h2>Условие: Воспроизведение длительности</h2>
        <p>Вы увидите шарик в центре экрана на некоторое время.</p>
        <p>После паузы шарик появится снова.</p>
        <p><strong>Задача:</strong> Нажмите ПРОБЕЛ, когда пройдет столько же времени, сколько длилось первое предъявление.</p>
        ${isTraining ? '<p><em>Это тренировка.</em></p>' : ''}
      `
    };

    return instructions[conditionType] || '';
  }
}
