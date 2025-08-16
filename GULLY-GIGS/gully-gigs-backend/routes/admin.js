// File: routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');
const { Parser } = require('json2csv');

// Dashboard summary stats (admin only)
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const { id } = req.user;
    const roleRes = await db.query('SELECT role FROM users WHERE id = $1', [id]);
    if (roleRes.rows[0]?.role !== 'admin') {
      return res.status(403).json({ msg: 'Admins only' });
    }

    const stats = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open' AND is_deleted = FALSE) AS open_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress' AND is_deleted = FALSE) AS in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' AND is_deleted = FALSE) AS completed_tasks,
        COUNT(*) FILTER (WHERE status = 'paid' AND is_deleted = FALSE) AS paid_tasks,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND is_deleted = FALSE), 0) AS total_earned
      FROM tasks
    `);

    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
