import React, { useState } from 'react';
import './SANQuestionnaire.css';

// Опросник САН (Самочувствие, Активность, Настроение)
const SAN_QUESTIONS = [
  // Самочувствие
  { id: 'health1', category: 'health', left: 'Чувствую себя плохо', right: 'Чувствую себя хорошо' },
  { id: 'health2', category: 'health', left: 'Чувствую себя слабым', right: 'Чувствую себя сильным' },
  { id: 'health3', category: 'health', left: 'Пассивный', right: 'Активный' },
  { id: 'health4', category: 'health', left: 'Малоподвижный', right: 'Подвижный' },
  { id: 'health5', category: 'health', left: 'Медлительный', right: 'Быстрый' },
  { id: 'health6', category: 'health', left: 'Чувствую себя отдохнувшим', right: 'Чувствую себя усталым' },

  // Активность
  { id: 'activity1', category: 'activity', left: 'Рассеянный', right: 'Внимательный' },
  { id: 'activity2', category: 'activity', left: 'Безучастный', right: 'Увлеченный' },
  { id: 'activity3', category: 'activity', left: 'Желания отдохнуть', right: 'Желание работать' },
  { id: 'activity4', category: 'activity', left: 'Напряженный', right: 'Расслабленный' },
  { id: 'activity5', category: 'activity', left: 'Нервный', right: 'Спокойный' },

  // Настроение
  { id: 'mood1', category: 'mood', left: 'Грустный', right: 'Веселый' },
  { id: 'mood2', category: 'mood', left: 'Плохое настроение', right: 'Хорошее настроение' },
  { id: 'mood3', category: 'mood', left: 'Неудовлетворенный', right: 'Удовлетворенный' },
  { id: 'mood4', category: 'mood', left: 'Подавленный', right: 'Приподнятый' },
  { id: 'mood5', category: 'mood', left: 'Несчастный', right: 'Счастливый' }
];

function SANQuestionnaire({ blockNumber, onComplete }) {
  const [answers, setAnswers] = useState({});

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Проверяем, что все вопросы отвечены
    if (Object.keys(answers).length < SAN_QUESTIONS.length) {
      alert('Пожалуйста, ответьте на все вопросы');
      return;
    }

    // Вычисляем средние баллы по категориям
    const categories = {
      health: [],
      activity: [],
      mood: []
    };

    SAN_QUESTIONS.forEach(question => {
      const value = answers[question.id];
      categories[question.category].push(value);
    });

    const results = {
      health: categories.health.reduce((a, b) => a + b, 0) / categories.health.length,
      activity: categories.activity.reduce((a, b) => a + b, 0) / categories.activity.length,
      mood: categories.mood.reduce((a, b) => a + b, 0) / categories.mood.length,
      rawAnswers: answers,
      timestamp: Date.now()
    };

    onComplete(results);
  };

  const allAnswered = Object.keys(answers).length === SAN_QUESTIONS.length;

  return (
    <div className="san-questionnaire">
      <div className="questionnaire-content">
        <h2>Оценка самочувствия (САН)</h2>
        <p>Оцените ваше текущее состояние по шкале от 1 до 7</p>

        <form onSubmit={handleSubmit}>
          <div className="questions-list">
            {SAN_QUESTIONS.map((question, index) => (
              <div key={question.id} className="question-item">
                <div className="question-number">{index + 1}</div>
                <div className="question-scale">
                  <span className="scale-label left">{question.left}</span>
                  <div className="scale-options">
                    {[1, 2, 3, 4, 5, 6, 7].map(value => (
                      <label key={value} className="scale-option">
                        <input
                          type="radio"
                          name={question.id}
                          value={value}
                          checked={answers[question.id] === value}
                          onChange={() => handleAnswerChange(question.id, value)}
                        />
                        <span className="radio-mark">{value}</span>
                      </label>
                    ))}
                  </div>
                  <span className="scale-label right">{question.right}</span>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={!allAnswered}>
            Завершить блок
          </button>
        </form>

        <div className="progress-indicator">
          Отвечено: {Object.keys(answers).length} / {SAN_QUESTIONS.length}
        </div>
      </div>
    </div>
  );
}

export default SANQuestionnaire;
