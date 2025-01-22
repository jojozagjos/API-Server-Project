const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const cardRoutes = require('./routes/cards');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(bodyParser.json());

// Route Handlers
app.use('/auth', authRoutes);
app.use('/cards', cardRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ errorMessage: err.message || 'Internal server error.' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
