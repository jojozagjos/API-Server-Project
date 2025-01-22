const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const usersPath = path.join(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET;

// /getToken endpoint
router.post('/getToken', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ errorMessage: 'Username and password are required.' });
    }

    const users = JSON.parse(fs.readFileSync(usersPath));
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ errorMessage: 'Invalid credentials.' });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

module.exports = router;
