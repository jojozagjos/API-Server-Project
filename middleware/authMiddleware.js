const express = require('express');
const jwt = require('jwt-simple');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');  // Required for serving static files
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file when accessing the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// File paths
const usersFile = path.join(__dirname, 'data', 'users.json');
const cardsFile = path.join(__dirname, 'data', 'cards.json');

// Authentication middleware to check JWT tokens
function authenticate(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send({ error: 'No token provided' });

    try {
        const decoded = jwt.decode(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send({ error: 'Invalid or expired token' });
    }
}

// Helper to read JSON file with error handling and initialization
function readJSONFile(filePath) {
    if (!fs.existsSync(filePath)) {
        // Initialize file with empty array if it doesn't exist
        fs.writeFileSync(filePath, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Helper to write to JSON file
function writeJSONFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Create new account (POST /register)
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const users = readJSONFile(usersFile);

    if (users.some(user => user.username === username)) {
        return res.status(400).send({ error: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashedPassword });

    writeJSONFile(usersFile, users);

    res.send({ success: true, message: 'Account created successfully!' });
});

// Login (POST /getToken)
app.post('/getToken', (req, res) => {
    const { username, password } = req.body;
    const users = readJSONFile(usersFile);
    const user = users.find(user => user.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).send({ error: 'Invalid credentials' });
    }

    // Add expiry to token (1 hour expiry)
    const payload = { username: user.username, exp: Math.floor(Date.now() / 1000) + (60 * 60) }; // 1 hour expiry
    const token = jwt.encode(payload, process.env.JWT_SECRET);

    res.send({ token });
});

// Cards CRUD Endpoints
// Get all cards (GET /cards)
app.get('/cards', authenticate, (req, res) => {
    const cards = readJSONFile(cardsFile);
    res.send(cards);
});

// Create a new card (POST /cards)
app.post('/cards', authenticate, (req, res) => {
    const { name, rarity } = req.body;

    // Validate input
    if (!name || name.trim() === "") {
        return res.status(400).send({ error: 'Name is required and cannot be empty' });
    }

    const allowedRarities = ['common', 'uncommon', 'rare', 'legendary'];
    if (!allowedRarities.includes(rarity)) {
        return res.status(400).send({ error: `Rarity must be one of: ${allowedRarities.join(', ')}` });
    }

    const cards = readJSONFile(cardsFile);
    const newCard = { id: Date.now(), name, rarity }; // Simple ID generation

    cards.push(newCard);
    writeJSONFile(cardsFile, cards);

    res.status(201).send(newCard); // Return the newly created card
});

// Update an existing card (PUT /cards/:id)
app.put('/cards/:id', authenticate, (req, res) => {
    const { id } = req.params;
    const { name, rarity } = req.body;

    const cards = readJSONFile(cardsFile);
    const cardIndex = cards.findIndex(card => card.id == id);

    if (cardIndex === -1) {
        return res.status(404).send({ error: 'Card not found' });
    }

    // Validate input
    if (name) cards[cardIndex].name = name;
    if (rarity) {
        const allowedRarities = ['common', 'uncommon', 'rare', 'legendary'];
        if (!allowedRarities.includes(rarity)) {
            return res.status(400).send({ error: `Rarity must be one of: ${allowedRarities.join(', ')}` });
        }
        cards[cardIndex].rarity = rarity;
    }

    writeJSONFile(cardsFile, cards);

    res.send(cards[cardIndex]);
});

// Delete a card (DELETE /cards/:id)
app.delete('/cards/:id', authenticate, (req, res) => {
    const { id } = req.params;

    const cards = readJSONFile(cardsFile);
    const cardIndex = cards.findIndex(card => card.id == id);

    if (cardIndex === -1) {
        return res.status(404).send({ error: 'Card not found' });
    }

    const deletedCard = cards.splice(cardIndex, 1);
    writeJSONFile(cardsFile, cards);

    res.send(deletedCard[0]);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
