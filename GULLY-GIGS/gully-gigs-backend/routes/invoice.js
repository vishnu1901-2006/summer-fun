// File: routes/invoice.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');
const verifyToken = require('../middleware/authMiddleware');

router.get('/invoice/:taskId', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    const taskRes = await db.query('SELECT * FROM tasks WHERE id = $1 AND status = $2', [taskId, 'paid']);
    const task = taskRes.rows[0];

    if (!task) return res.status(404).json({ msg: 'Paid task not found' });

    const requester = await db.query('SELECT name, email FROM users WHERE id = $1', [task.requester_id]);
    const helper = await db.query('SELECT name, email FROM users WHERE id = $1', [task.helper_id]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_task_${taskId}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text('Gully Gigs Invoice', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Task ID: ${task.id}`);
    doc.text(`Title: ${task.title}`);
    doc.text(`Amount Paid: $${task.amount}`);
    doc.text(`Payment Intent ID: ${task.payment_intent_id}`);
    doc.text(`Stripe Charge ID: ${task.charge_id}`);
    doc.text(`Status: ${task.status}`);
    doc.moveDown();

    doc.text(`Requester: ${requester.rows[0].name} (${requester.rows[0].email})`);
    doc.text(`Helper: ${helper.rows[0].name} (${helper.rows[0].email})`);
    doc.text(`Issued At: ${new Date().toLocaleString()}`);

    doc.end();
  } catch (err) {
    console.error('Invoice generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
