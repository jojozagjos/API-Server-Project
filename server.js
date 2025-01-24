const express = require('express');
const jwt = require('jsonwebtoken');  // Use jsonwebtoken for decoding/encoding JWT
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Use verify instead of decode
        console.log('Authenticated user:', decoded);  // Should log both username and id
        req.user = decoded;  // Make sure decoded object has correct data
        next();
    } catch (err) {
        return res.status(401).send({ error: 'Invalid or expired token' });
    }
}

// Helper to read JSON file
function readJSONFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading or parsing file ${filePath}:`, err);
        throw err;
    }
}


// Helper to write to JSON file
function writeJSONFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing to file ${filePath}:`, err);
        throw err;  // Rethrow the error to be caught in the route handler
    }
}

// Create new account (POST /register)
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const users = readJSONFile(usersFile);

    if (users.some(user => user.username === username)) {
        return res.status(400).send({ error: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashedPassword, inventory: [] });

    writeJSONFile(usersFile, users);

    res.send({ success: true, message: 'Account created successfully!' });
});

// Login (POST /getToken)
app.post('/getToken', (req, res) => {
    const { username, password } = req.body;
    try {
        const users = readJSONFile(usersFile);
        const user = users.find(user => user.username === username);

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        // Log the user data before generating the token
        console.log('User found:', user);

        // Encode the user with both the username and id
        const token = jwt.sign({ username: user.username, id: user.id }, process.env.JWT_SECRET);

        // Log the token creation
        console.log('Generated token:', token);

        res.send({ token });
    } catch (err) {
        console.error('Error in getToken route:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Get all cards (GET /cards)
app.get('/cards', authenticate, (req, res) => {
    const cards = readJSONFile(cardsFile);
    res.send(cards);
});

// Create a new card (POST /cards)
app.post('/cards', authenticate, (req, res) => {
    const { name, rarity } = req.body;

    // Validate input
    if (!name || !rarity) {
        return res.status(400).send({ error: 'Name and rarity are required' });
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

    if (name) cards[cardIndex].name = name;
    if (rarity) cards[cardIndex].rarity = rarity;

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

// Add a card to the user's inventory (POST /addCardToInventory)
app.post('/addCardToInventory', authenticate, (req, res) => {
    const cardId = req.body.cardId;

    if (!cardId) {
        return res.status(400).send({ error: 'Card ID is required' });
    }

    const users = readJSONFile(usersFile);
    const user = users.find(u => u.username === req.user.username);

    if (!user) {
        return res.status(404).send({ error: 'User not found' });
    }

    // Access the `cards` property in the JSON file
    const cardsData = readJSONFile(cardsFile);
    const cards = cardsData.cards; // Access the `cards` array

    if (!Array.isArray(cards)) {
        return res.status(500).send({ error: 'Cards data is corrupted' });
    }

    const card = cards.find(c => c.id == cardId);

    if (!card) {
        return res.status(404).send({ error: 'Card not found' });
    }

    if (!user.inventory.includes(cardId)) {
        user.inventory.push(cardId);
        writeJSONFile(usersFile, users);
    }

    res.send({ success: true, card });
});

// Get the user's inventory (GET /inventory)
app.get('/inventory', authenticate, (req, res) => {
    try {
        const users = readJSONFile(usersFile);
        const user = users.find(u => u.username === req.user.username);
        if (!user) {
            console.error(`User not found: ${req.user.username}`);
            return res.status(404).send({ error: 'User not found' });
        }
        const cardsData = readJSONFile(cardsFile);
        const cards = cardsData.cards || [];  // Safely access the cards array
        console.log('Fetched cards:', cards);  // Debug log
        const userCards = user.inventory.map(cardId => {
            const card = cards.find(c => c.id === cardId);
            if (!card) {
                console.error(`Card with ID ${cardId} not found`);
                return null;  // Return null if the card is not found
            }
            return card;  // Return the valid card
        }).filter(card => card !== null);  // Remove null values
        console.log('User cards:', userCards);  // Debug log for user cards
        res.send(userCards);
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).send({ error: 'Internal server error' });
    }
});

// Add a card to the user's inventory (POST /inventory)
app.post('/inventory', authenticate, (req, res) => {
    const { cardId } = req.body;

    if (!cardId) return res.status(400).send({ error: 'Card ID is required' });

    const users = readJSONFile(usersFile);
    const user = users.find(u => u.username === req.user.username);

    if (!user) return res.status(404).send({ error: 'User not found' });

    const cardsData = readJSONFile(cardsFile);  // Read the whole file, which returns an object
    const cards = cardsData.cards;  // Access the cards array within the object
    const card = cards.find(card => card.id === cardId);

    if (!card) return res.status(404).send({ error: 'Card not found' });

    if (!user.inventory.includes(cardId)) {
        user.inventory.push(cardId);
        writeJSONFile(usersFile, users);
        console.log(`Card ID ${cardId} added to ${user.username}'s inventory`);
    } else {
        console.log(`Card ID ${cardId} already in inventory`);
    }
    
    res.send({ success: true, message: 'Card added to inventory' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
