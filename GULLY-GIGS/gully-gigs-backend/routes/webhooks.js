// File: routes/webhooks.js
const express = require('express');
const router = express.Router();
require('dotenv').config();
const db = require('../db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');

// Stripe requires raw body for signature verification
router.post('/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const taskId = paymentIntent.metadata.taskId;
    const intentId = paymentIntent.id;
    const chargeId = paymentIntent.latest_charge;
    const status = paymentIntent.status;

    try {
      await db.query(
        `UPDATE tasks
         SET status = 'paid',
             payment_intent_id = $1,
             charge_id = $2,
             payment_status = $3
         WHERE id = $4`,
        [intentId, chargeId, status, taskId]
      );
      console.log(`✅ Task ${taskId} marked as paid. Intent: ${intentId}, Charge: ${chargeId}`);
    } catch (err) {
      console.error('❌ Failed to update task payment status:', err.message);
    }
  }

  res.json({ received: true });
});

module.exports = router;
