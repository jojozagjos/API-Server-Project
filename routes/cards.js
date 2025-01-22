const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const cardsPath = path.join(__dirname, '../data/cards.json');

// Retrieve all cards with optional filtering
router.get('/', (req, res) => {
    const { set, type, rarity } = req.query;
    const cards = JSON.parse(fs.readFileSync(cardsPath));

    let filteredCards = cards;
    if (set) filteredCards = filteredCards.filter(card => card.set === set);
    if (type) filteredCards = filteredCards.filter(card => card.type === type);
    if (rarity) filteredCards = filteredCards.filter(card => card.rarity === rarity);

    res.json(filteredCards);
});

// Create a new card
router.post('/create', authMiddleware, (req, res) => {
    const newCard = req.body;
    const cards = JSON.parse(fs.readFileSync(cardsPath));

    if (cards.some(card => card.cardId === newCard.cardId)) {
        return res.status(400).json({ errorMessage: 'Card ID must be unique.' });
    }

    cards.push(newCard);
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2));
    res.json({ successMessage: 'Card created successfully.', card: newCard });
});

// Update an existing card
router.put('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const updatedCard = req.body;
    const cards = JSON.parse(fs.readFileSync(cardsPath));

    const cardIndex = cards.findIndex(card => card.cardId === id);
    if (cardIndex === -1) {
        return res.status(404).json({ errorMessage: 'Card not found.' });
    }

    cards[cardIndex] = { ...cards[cardIndex], ...updatedCard };
    fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2));
    res.json({ successMessage: 'Card updated successfully.', card: cards[cardIndex] });
});

// Delete an existing card
router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const cards = JSON.parse(fs.readFileSync(cardsPath));

    const filteredCards = cards.filter(card => card.cardId !== id);
    if (filteredCards.length === cards.length) {
        return res.status(404).json({ errorMessage: 'Card not found.' });
    }

    fs.writeFileSync(cardsPath, JSON.stringify(filteredCards, null, 2));
    res.json({ successMessage: 'Card deleted successfully.' });
});

module.exports = router;
