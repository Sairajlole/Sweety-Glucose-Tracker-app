const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const readingsRoutes = require('./routes/readings.routes');
const reportsRoutes = require('./routes/reports.routes');

const app = express();

// ---------------------------------------------------------------------------
// CORS - only the configured frontend origins may call the API.
// ---------------------------------------------------------------------------
const allowedOrigins = new Set([
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, Supertest, server-to-server)
      // are allowed; browser requests must match the allow-list.
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sweety API is running',
    data: { environment: config.env, timestamp: new Date().toISOString() },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/reports', reportsRoutes);

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
