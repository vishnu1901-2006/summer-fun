// File: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db');
const taskRoutes = require('./routes/tasks');
const invoiceRoutes = require('./routes/invoice');

app.use(cors());
app.use(express.json());
app.use('/api/invoice', invoiceRoutes);

app.use('/api/tasks', taskRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const paymentRoutes = require('./routes/payments'); // ADD THIS
app.use('/api/payments', paymentRoutes);            // ADD THIS

const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', webhookRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
