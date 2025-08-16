// File: routes/payments.js
require('dotenv').config(); // must be at the top
const express = require('express');
const router = express.Router();
const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const verifyToken = require('../middleware/authMiddleware');

// Create a PaymentIntent for a task
router.post('/pay/:taskId', verifyToken, async (req, res) => {
  const taskId = req.params.taskId;

  try {
    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    const task = taskRes.rows[0];
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: task.amount * 100, // in cents
      currency: 'usd',
      metadata: { taskId: task.id },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
