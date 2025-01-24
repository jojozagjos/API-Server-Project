let token = '';  // Store JWT Token after login
let isSpinning = false;  // Flag to track spinning state
let inventory = [];  // Declare inventory globally
let isDragging = false;

// Login form submission
document.getElementById('login').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    login(username, password);
});

// Create account form submission
document.getElementById('create-account').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    createAccount(username, password);
});

// Logout button event listener
document.getElementById('logout-button').addEventListener('click', function() {
    logout();
});

// Spin button event listener
document.getElementById('spin-button').addEventListener('click', function() {
    if (!isSpinning) {
        spinSlotMachine();
    }
});

// Show the Create Account form
function showCreateAccount() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('create-account-form').style.display = 'block';
}

// Show the Login form
function showLogin() {
    document.getElementById('create-account-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// Event Listener for Sort Selection
document.getElementById('sort-select').addEventListener('change', function() {
    const sortBy = this.value;  // Get the selected sort option (name, rarity, power, etc.)
    if (inventory && inventory.length > 0) {
        const sortedCards = sortInventory(inventory, sortBy);  // Sort the cards based on selection
        displayInventory(sortedCards);  // Display the sorted inventory
    }
});

// Check if the user is already logged in when the page loads
window.onload = function () {
    token = localStorage.getItem('token'); // Retrieve the token from localStorage
    const usernameDisplay = document.getElementById('username-display');
    usernameDisplay.textContent = "Welcome, Loading...!"; // Change text to "Loading..."

    if (token) {
        // Decode the token to get user information
        const payload = JSON.parse(atob(token.split('.')[1])); // Decode the token payload
        const username = payload.username; // Extract username from the token

        if (username) {
            usernameDisplay.textContent = `${username}!`; // Update with the user's name
        } else {
            usernameDisplay.textContent = "Welcome, User!";
        }

        // If token exists, auto-login and fetch user data
        getUserInventory();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-dashboard').style.display = 'block';
    } else {
        // Otherwise, show login form
        document.getElementById('login-form').style.display = 'block';
    }
};

// Login function
function login(username, password) {
    fetch('/getToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            token = data.token;
            localStorage.setItem('token', token); // Save token to localStorage
            getUserInventory();  // Fetch user's inventory after login
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('user-dashboard').style.display = 'block';
            document.getElementById('username-display').textContent = username;
        } else {
            alert('Login failed');
        }
    })
    .catch(err => alert('Error logging in: ' + err));
}

// Create Account function
function createAccount(username, password) {
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Account created successfully!');
            showLogin();
        } else {
            alert('Account creation failed');
        }
    });
}

// Logout function
function logout() {
    localStorage.removeItem('token');  // Clear the token from localStorage
    document.getElementById('user-dashboard').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function getRarityColor(rarity) {
    switch (rarity) {
        case 'Common': return 'gray';
        case 'Uncommon': return 'green';
        case 'Rare': return 'blue';
        case 'Epic': return 'purple';
        case 'Legendary': return 'gold';
        default: return 'white';
    }
}

const rarityDropRates = {
    'Common': 0.5,   // 50% chance
    'Uncommon': 0.3, // 30% chance
    'Rare': 0.15,    // 15% chance
    'Epic': 0.04,    // 4% chance
    'Legendary': 0.01 // 1% chance
};

function resetDropRates() {
    // Reset drop rates to their initial values
    rarityDropRates = {
        'Common': 0.5,   // 50% chance
        'Uncommon': 0.3, // 30% chance
        'Rare': 0.15,    // 15% chance
        'Epic': 0.04,    // 4% chance
        'Legendary': 0.01 // 1% chance
    };
}

// Get Rarity Priority for Sorting (optional, depending on how you want to order rarities)
function getRarityPriority(rarity) {
    const rarityOrder = {
        'Common': 1,
        'Uncommon': 2,
        'Rare': 3,
        'Epic': 4,
        'Legendary': 5
    };
    return rarityOrder[rarity] || 0;  // Default to 0 if rarity is not recognized
}

// Fetch User Inventory from the server
function getUserInventory() {
    const token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (!token) {
        console.error('No token found, user is not authenticated.');
        return;
    }
    fetch('/inventory', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(res => {
        if (!res.ok) {
            // If the response status code is not in the 2xx range, throw an error
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        console.log("Fetched inventory data:", data);  // Log the response data
        if (data.error) {
            console.error("Error fetching inventory:", data.error);
            return;
        }
        if (Array.isArray(data)) {
            inventory = data;  // Store the fetched inventory
            displayInventory(data);  // Proceed with valid array
        } else {
            console.error("Invalid data format:", data);
        }
    })
    .catch(err => {
        console.error('Error fetching inventory:', err);
    });
}

// Add Card to Inventory
function addCardToInventory(cardData) {
    const token = localStorage.getItem('token'); // Get the token from local storage
    // Make sure the token exists before proceeding
    if (!token) {
        console.error("No token found, user is not authenticated.");
        return;
    }
    // Send the request to the server to add the card to the user's inventory
    fetch('http://localhost:3000/addCardToInventory', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cardId: cardData.id })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Card added to inventory:", data.card);
            inventory.push(data.card); // Add the card to the inventory
            displayInventory(inventory); // Immediately update the UI with the new inventory
        } else {
            console.error("Error adding card to inventory:", data.error);
        }
    })
    .catch(err => {
        console.error("Error adding card to inventory:", err);
    });
}

// Ensure card elements exist before applying event listeners
function addRotationEvents(cardElement) {
    let startX, startY, rotateX = 0, rotateY = 0;

    // Check if cardElement is not null before adding event listeners
    if (cardElement) {
        cardElement.addEventListener('mousedown', function(e) {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            cardElement.style.transition = 'none';  // Remove transition during dragging
            isDragging = true;  // Set dragging state to true
        });

        cardElement.addEventListener('mousemove', function(e) {
            if (isDragging && startX && startY) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                // Apply 3D rotation based on mouse movement (inverted directions)
                rotateX -= deltaY * 3; // Reverse sensitivity to vertical movement
                rotateY += deltaX * 3; // Reverse sensitivity to horizontal movement
                cardElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                startX = e.clientX;
                startY = e.clientY;
            }
        });

        cardElement.addEventListener('mouseup', function() {
            cardElement.style.transition = 'transform 0.3s ease-in-out';  // Add smooth transition after mouse release
            isDragging = false;  // Reset dragging state
        });

        cardElement.addEventListener('mouseleave', function() {
            // Reset rotation to 0 degrees when mouse leaves
            rotateX = 0;
            rotateY = 0;
            cardElement.style.transition = 'transform 0.3s ease-in-out';  // Smooth transition back to original position
            cardElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            isDragging = false;  // Reset dragging state
        });
    }
}

// Display Inventory
function displayInventory(cards) {
    const inventoryList = document.getElementById('inventory-list');
    inventoryList.innerHTML = '';  // Clear current inventory

    if (Array.isArray(cards) && cards.length > 0) {
        cards.forEach(card => {
            if (card && card.name && card.rarity) {  // Ensure card has necessary properties
                const cardElement = document.createElement('div');
                cardElement.classList.add('card');
                
                // Set the background color based on rarity
                const rarityColor = getRarityColor(card.rarity);
                cardElement.style.borderLeft = `10px solid ${rarityColor}`;

                // Add card details
                cardElement.innerHTML = `
                    <div class="card-content">
                        <p><strong>Name:</strong> ${card.name}</p>
                        <p><strong>Rarity:</strong> ${card.rarity}</p>
                        <p><strong>Type:</strong> ${card.type}</p>
                        <p><strong>Power:</strong> ${card.power}</p>
                        <p><strong>Toughness:</strong> ${card.toughness}</p>
                        <p><strong>Cost:</strong> ${card.cost}</p>
                    </div>
                `;
                inventoryList.appendChild(cardElement);
                // Add drag events to the card
                addRotationEvents(cardElement);
            } else {
                console.error("Card format is invalid:", card);  // Log any invalid card format
            }
        });
    } else {
        inventoryList.innerHTML = "<p>No cards in inventory</p>";  // Inform the user via UI
    }
}

// Function to Sort Inventory based on selected criteria
function sortInventory(cards, sortBy) {
    return cards.sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);  // Sort by name alphabetically
        } else if (sortBy === 'rarity') {
            return getRarityPriority(a.rarity) - getRarityPriority(b.rarity);  // Sort by rarity
        } else if (sortBy === 'power') {
            return a.power - b.power;  // Sort by power
        } else if (sortBy === 'toughness') {
            return a.toughness - b.toughness;  // Sort by toughness
        } else if (sortBy === 'type') {
            return a.type.localeCompare(b.type);  // Sort by creature type alphabetically
        }
        return 0;  // No sorting
    });
}

let initialContainerOffset = null; // Store initial offset value

function spinSlotMachine() {
    if (isSpinning) return; // Prevent multiple spins at once
    isSpinning = true;
    const slotMachine = document.getElementById('slot-machine');
    const cardContainer = slotMachine.querySelector('.card-container');

    // Apply the pity system before the spin
    applyPitySystem();

    // Clear previous cards
    cardContainer.innerHTML = '';

    token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (!token) {
        console.error('No token found, user is not authenticated.');
        isSpinning = false;
        return;
    }

    fetch('/cards', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(res => res.json())
    .then(response => {
        if (response.error) {
            console.error("Error fetching cards:", response.error);
            isSpinning = false;
            return;
        }

        if (!Array.isArray(response.cards)) {
            console.error('Invalid cards response:', response);
            isSpinning = false;
            return;
        }

        const totalCards = response.cards;
        const randomCards = getRandomCards(totalCards);

        randomCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            const rarityColor = getRarityColor(card.rarity);
            cardElement.style.borderLeft = `10px solid ${rarityColor}`;
            cardElement.innerHTML = `
                <div class="card-content">
                    <p><strong>Name:</strong> ${card.name}</p>
                    <p><strong>Rarity:</strong> ${card.rarity}</p>
                    <p><strong>Type:</strong> ${card.type}</p>
                    <p><strong>Power:</strong> ${card.power}</p>
                    <p><strong>Toughness:</strong> ${card.toughness}</p>
                    <p><strong>Cost:</strong> ${card.cost}</p>
                </div>
            `;
            cardContainer.appendChild(cardElement);
        });

        const cardWidth = cardContainer.firstChild.getBoundingClientRect().width; // Accurate card width
        const computedStyle = window.getComputedStyle(cardContainer.firstChild);
        const marginLeft = parseFloat(computedStyle.marginLeft) || 0;
        const marginRight = parseFloat(computedStyle.marginRight) || 0;
        const totalCardWidth = cardWidth + marginLeft + marginRight;

        const containerWidth = slotMachine.getBoundingClientRect().width; // Slot-machine visible area width
         // Store initial container offset the first time the function is called
        if (initialContainerOffset === null) {
            // Ensure we calculate the container offset correctly and only once
            initialContainerOffset = cardContainer.getBoundingClientRect().left - slotMachine.getBoundingClientRect().left;
        }
        const containerOffset = initialContainerOffset;

        console.log(containerOffset)

        // Generate a random index between the midpoint and the end of the cards array
        const minIndex = Math.floor(randomCards.length / 2);
        const maxIndex = randomCards.length - 1;
        const targetIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex; // Random whole number in range

        console.log(targetIndex)

        cardContainer.style.transition = 'none'; 
        cardContainer.style.transform = 'translateX(0)';

        let finalPosition = (targetIndex * totalCardWidth) - ((containerWidth - totalCardWidth) / 2) + containerOffset;
        finalPosition = Math.abs(finalPosition);  // Flip negative to positive
        console.log(finalPosition)

        setTimeout(() => {
            const spinDuration = 5; 
            cardContainer.style.transition = `${spinDuration}s ease-in-out`;
            cardContainer.style.transform = `translateX(-${finalPosition}px)`; 

            setTimeout(() => {
                const finalCard = randomCards[targetIndex]; // Use the fixed index here
                showFinalCard(finalCard);
                addCardToInventory(finalCard);

                isSpinning = false;

                cardContainer.style.transition = 'none'; 
                cardContainer.style.transform = `translateX(-${finalPosition}px)`; 
            }, spinDuration * 1000);
        }, 100);
    })
    .catch(err => {
        console.error('Error spinning:', err);
        isSpinning = false;
    });
}

// Function to apply the pity system and modify drop rates
function applyPitySystem() {
    if (spinsSinceLastRare >= pityThreshold) {

        // Increase the chances of getting Rare, Epic, and Legendary cards
        rarityDropRates['Rare'] += pityMultiplier;
        rarityDropRates['Epic'] += pityMultiplier;
        rarityDropRates['Legendary'] += pityMultiplier;

        // Normalize drop rates (make sure they don't exceed 1 in total)
        const totalWeight = Object.values(rarityDropRates).reduce((sum, rate) => sum + rate, 0);
        const normalizationFactor = 1 / totalWeight; // Normalize to ensure total probability sums to 1
        for (const rarity in rarityDropRates) {
            rarityDropRates[rarity] *= normalizationFactor;
        }

        console.log("Pity applied! New drop rates:", rarityDropRates);
        // resetDropRates()
    }
}

function getRandomCards(cards) {
    const randomCards = [];
    const numberOfCards = cards.length;  // Number of cards to show in the "slot machine"

    for (let i = 0; i < numberOfCards; i++) {
        const randomCard = getRandomCardByRarity(cards);
        randomCards.push(randomCard);
    }

    return randomCards;
}

// Pity system parameters
let spinsSinceLastRare = 0; // Counter for spins since the last rare card
const pityThreshold = 1; // After how many spins the pity increases
const pityMultiplier = 0.05; // How much the drop rates increase each pity cycle

// Select a random card based on the rarity drop rates
function getRandomCardByRarity(cards) {
    const totalWeight = Object.values(rarityDropRates).reduce((sum, rate) => sum + rate, 0);

    // Generate a random number between 0 and 1
    const randomValue = Math.random();

    let cumulativeProbability = 0;
    
    // Determine the rarity based on the random number and drop rates
    for (const rarity in rarityDropRates) {
        cumulativeProbability += rarityDropRates[rarity];
        if (randomValue < cumulativeProbability) {
            // Filter cards by rarity and pick one randomly
            const filteredCards = cards.filter(card => card.rarity === rarity);
            const randomIndex = Math.floor(Math.random() * filteredCards.length);
            const selectedCard = filteredCards[randomIndex];

            return selectedCard;
        }
    }

    // If no card was selected (shouldn't happen), pick a random card
    return cards[Math.floor(Math.random() * cards.length)];
}

// Function to show the final card in a modal or overlay
function showFinalCard(card) {
    const cardContainer = document.getElementById('slot-machine').querySelector('.card-container');

     // If the selected card is rare (Rare, Epic, or Legendary), reset the pity counter
     if (['Rare', 'Epic', 'Legendary'].includes(card.rarity)) {
        spinsSinceLastRare = 0; // Reset pity counter
    } else {
        spinsSinceLastRare++; // Increase pity counter for non-rare cards
    }
    
    document.getElementById('pity-status').textContent = spinsSinceLastRare + "/50";

    if (spinsSinceLastRare >= pityThreshold) {
        const spinButton = document.getElementById('spin-button'); // Spin button
        spinButton.style.backgroundColor = "yellow"; // Change button color to indicate pity applied (if applicable)
    } else {
        const spinButton = document.getElementById('spin-button'); // Spin button
        spinButton.style.backgroundColor = ""; // Change button color to indicate pity applied (if applicable)
        resetDropRates()
    }

    // Create a modal overlay if it doesn't exist
    let modal = document.getElementById('final-card-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'final-card-modal';
        modal.style.position = 'fixed';
        modal.style.top = 0;
        modal.style.left = 0;
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = 9999;
        document.body.appendChild(modal);
    }

    // Create a button inside the modal to close it and continue
    const continueButton = document.createElement('button');
    continueButton.textContent = 'Continue';
    continueButton.style.padding = '5px 10px';
    continueButton.style.fontSize = '14px';
    continueButton.style.backgroundColor = '#28a745';
    continueButton.style.color = '#fff';
    continueButton.style.border = 'none';
    continueButton.style.cursor = 'pointer';
    continueButton.style.marginTop = '20px'; // Spacing between card and button
    continueButton.onclick = function() {
        modal.style.display = 'none';  // Hide the modal when the user clicks continue
    };

    // Clear any previous content in the modal and create the new final card element
    modal.innerHTML = '';

    // Card Element
    const rarityColor = getRarityColor(card.rarity);
    const finalCardElement = document.createElement('div');
    finalCardElement.classList.add('card');
    finalCardElement.style.borderLeft = `10px solid ${rarityColor}`;
    finalCardElement.style.padding = '20px';
    finalCardElement.style.backgroundColor = '#fff';
    finalCardElement.style.maxWidth = '300px'; // Set max width for the card
    finalCardElement.style.textAlign = 'center'; // Center text in the card
    finalCardElement.innerHTML = `
        <div class="card-content">
            <p><strong>Name:</strong> ${card.name}</p>
            <p><strong>Rarity:</strong> ${card.rarity}</p>
            <p><strong>Type:</strong> ${card.type}</p>
            <p><strong>Power:</strong> ${card.power}</p>
            <p><strong>Toughness:</strong> ${card.toughness}</p>
            <p><strong>Cost:</strong> ${card.cost}</p>
        </div>
    `;

    // Add the card and button to the modal in a flex container
    const modalContent = document.createElement('div');
    modalContent.style.display = 'flex';
    modalContent.style.flexDirection = 'column'; // Stack elements vertically
    modalContent.style.alignItems = 'center'; // Center elements horizontally
    modalContent.appendChild(finalCardElement);
    modalContent.appendChild(continueButton);

    modal.appendChild(modalContent);

    // Show the modal with the final card
    modal.style.display = 'flex';
}
