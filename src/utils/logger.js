// Система логирования эксперимента

export class ExperimentLogger {
  constructor(participantId) {
    this.participantId = participantId;
    this.logs = [];
    this.sessionStartTime = Date.now();
    this.currentTrial = null;
  }

  // Начало трайла
  startTrial(trialData) {
    this.currentTrial = {
      ...trialData,
      trialStartTime: Date.now(),
      events: []
    };
  }

  // Логирование события
  logEvent(eventType, eventData) {
    if (!this.currentTrial) return;

    const event = {
      eventType,
      timestamp: Date.now(),
      relativeTime: Date.now() - this.currentTrial.trialStartTime,
      ...eventData
    };

    this.currentTrial.events.push(event);
  }

  // Завершение трайла
  endTrial(response) {
    if (!this.currentTrial) return;

    const trialLog = {
      ...this.currentTrial,
      response,
      trialEndTime: Date.now(),
      trialDuration: Date.now() - this.currentTrial.trialStartTime
    };

    this.logs.push(trialLog);
    this.currentTrial = null;

    return trialLog;
  }

  // Получение всех логов
  getAllLogs() {
    return {
      participantId: this.participantId,
      sessionStartTime: this.sessionStartTime,
      sessionEndTime: Date.now(),
      totalDuration: Date.now() - this.sessionStartTime,
      trials: this.logs
    };
  }

  // Экспорт логов в JSON
  exportToJSON() {
    const data = this.getAllLogs();
    return JSON.stringify(data, null, 2);
  }

  // Сохранение логов в файл (для Electron)
  async saveToFile() {
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      const { app } = window.require('@electron/remote');

      const userDataPath = app.getPath('userData');
      const logsDir = path.join(userDataPath, 'experiment-logs');

      // Создаем директорию если не существует
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${this.participantId}_${timestamp}.json`;
      const filepath = path.join(logsDir, filename);

      const data = this.exportToJSON();
      fs.writeFileSync(filepath, data, 'utf8');

      console.log('Логи сохранены:', filepath);
      return filepath;
    } catch (error) {
      console.error('Ошибка сохранения логов:', error);
      // Fallback: сохраняем в localStorage
      this.saveToLocalStorage();
      return null;
    }
  }

  // Резервное сохранение в localStorage
  saveToLocalStorage() {
    try {
      const data = this.exportToJSON();
      const key = `experiment_${this.participantId}_${Date.now()}`;
      localStorage.setItem(key, data);
      console.log('Логи сохранены в localStorage:', key);
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  }

  // Добавление метаданных блока
  addBlockMetadata(blockNumber, blockData) {
    this.logs.push({
      type: 'block_metadata',
      blockNumber,
      timestamp: Date.now(),
      ...blockData
    });
  }
}
