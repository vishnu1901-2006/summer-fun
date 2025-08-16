// File: utils/logTaskChange.js
const db = require('../db');

async function logTaskChange(taskId, status, changedBy) {
  try {
    await db.query(
      'INSERT INTO task_logs (task_id, status, changed_by) VALUES ($1, $2, $3)',
      [taskId, status, changedBy]
    );
  } catch (err) {
    console.error('Failed to log task status:', err.message);
  }
}

module.exports = logTaskChange;
