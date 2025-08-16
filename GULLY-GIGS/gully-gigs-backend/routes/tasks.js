// File: routes/tasks.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');
const logTaskChange = require('../utils/logTaskChange');
const sendEmail = require('../utils/sendEmail');

// Create a new task (requester only)
router.post('/', verifyToken, async (req, res) => {
  const { title, description, amount, requester_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO tasks (title, description, amount, requester_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, amount, requester_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get all open tasks
router.get('/open', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM tasks WHERE status = 'open' AND is_deleted = FALSE");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get tasks assigned to logged-in helper
router.get('/assigned', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE helper_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get tasks posted by logged-in requester
router.get('/my-posted', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE requester_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Claim a task (helper accepts task)
router.post('/:id/accept', verifyToken, async (req, res) => {
  const taskId = req.params.id;
  const { helper_id } = req.body;
  try {
    const result = await db.query(
      "UPDATE tasks SET status = 'in_progress', helper_id = $1 WHERE id = $2 RETURNING *",
      [helper_id, taskId]
    );
    await logTaskChange(taskId, 'in_progress', req.user.id);

    const requester = await db.query('SELECT email FROM users WHERE id = $1', [result.rows[0].requester_id]);
    await sendEmail(requester.rows[0].email, 'Task Accepted', `Your task '${result.rows[0].title}' has been accepted.`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mark task as completed by helper (submit work)
router.post('/:id/complete', verifyToken, async (req, res) => {
  const taskId = req.params.id;
  try {
    const result = await db.query(
      "UPDATE tasks SET status = 'completed' WHERE id = $1 RETURNING *",
      [taskId]
    );
    await logTaskChange(taskId, 'completed', req.user.id);

    const requester = await db.query('SELECT email FROM users WHERE id = $1', [result.rows[0].requester_id]);
    await sendEmail(requester.rows[0].email, 'Task Completed', `Your task '${result.rows[0].title}' has been marked completed.`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Confirm task and release payment (by requester)
router.post('/:id/confirm', verifyToken, async (req, res) => {
  const taskId = req.params.id;
  try {
    const result = await db.query(
      "UPDATE tasks SET status = 'paid' WHERE id = $1 RETURNING *",
      [taskId]
    );
    await logTaskChange(taskId, 'paid', req.user.id);

    const helper = await db.query('SELECT email FROM users WHERE id = $1', [result.rows[0].helper_id]);
    await sendEmail(helper.rows[0].email, 'Task Confirmed & Paid', `You have been paid for task '${result.rows[0].title}'.`);

    res.json({ msg: 'Task confirmed and payment released', task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
