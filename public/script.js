let token = '';  // Store JWT Token after login
let isSpinning = false;  // Flag to track spinning state
let inventory = [];  // Declare inventory globally

document.getElementById('login').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    login(username, password);
});

document.getElementById('create-account').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    createAccount(username, password);
});

document.getElementById('logout-button').addEventListener('click', function() {
    logout();
});

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

// Check if the user is already logged in when the page loads
window.onload = function() {
    token = localStorage.getItem('token'); // Retrieve the token from localStorage
    const usernameDisplay = document.getElementById('username-display');
    usernameDisplay.textContent = "Welcome, Loading...!";  // Change text to "Loading..."

    if (token) {
        // If token exists, auto-login and fetch user data
        getUserInventory();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-dashboard').style.display = 'block';
        document.getElementById('username-display').textContent = 'Loading...'; // Placeholder
    } else {
        // Otherwise, show login form
        document.getElementById('login-form').style.display = 'block';
    }
};

// Add an inventory tab to show/hide inventory list
document.getElementById('inventory-tab').addEventListener('click', function() {
    const inventoryContainer = document.getElementById('inventory-container');
    inventoryContainer.style.display = inventoryContainer.style.display === 'none' ? 'block' : 'none';
});

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
            } else {
                console.error("Card format is invalid:", card);  // Log any invalid card format
            }
        });
    } else {
        inventoryList.innerHTML = "<p>No cards in inventory</p>";  // Inform the user via UI
    }
}

// Function to add card to inventory
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
        } else {
            console.error("Error adding card to inventory:", data.error);
        }
    })
    .catch(err => {
        console.error("Error adding card to inventory:", err);
    });
}

let startX, startY, startRotationX = 0, startRotationY = 0;
let isDragging = false;

document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
    });

    card.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            startRotationX += deltaY / 3;  // Adjust the sensitivity of X-axis rotation
            startRotationY -= deltaX / 3;  // Adjust the sensitivity of Y-axis rotation

            card.querySelector('.card-inner').style.transform = `rotateX(${startRotationX}deg) rotateY(${startRotationY}deg)`;
        }
    });

    card.addEventListener('mouseup', () => {
        isDragging = false;
    });

    card.addEventListener('mouseleave', () => {
        isDragging = false;
    });
});

// Spin Slot Machine function
function spinSlotMachine() {
    isSpinning = true;  // Set spinning flag to true
    const slotMachine = document.getElementById('slot-machine');
    const cardContainer = slotMachine.querySelector('.card-container');

    // Clear previous cards
    cardContainer.innerHTML = '';

    // Ensure the token is available before fetching the cards
    token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (!token) {
        console.error('No token found, user is not authenticated.');
        isSpinning = false;
        return;
    }

    // Fetch a new set of cards from the server each time the spin is triggered
    fetch('/cards', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(res => res.json())
    .then(response => {
        console.log("Fetched card data:", response);  // Log the card data
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

        // Generate a new set of cards for the spin
        const totalCards = response.cards;
        const randomCards = getRandomCards(totalCards);  // Get a new subset of cards for this spin
        randomCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.innerHTML = `<p>${card.name}</p><p>${card.rarity}</p>`;
            cardContainer.appendChild(cardElement);
        });

        // Reset the card container's transform property
        cardContainer.style.transition = 'none';  // Disable transition temporarily
        cardContainer.style.transform = 'translateX(0)';  // Start from the beginning

        // Add the tab to the center of the spin area
        const tab = document.createElement('div');
        tab.classList.add('tab');
        tab.innerText = 'SPINNING';
        slotMachine.appendChild(tab);

        // Trigger the spin animation
        const numCards = randomCards.length;
        const spinDuration = 3;  // Duration of the spin in seconds

        // Set the card-container's transform property to simulate a spin
        const spinAmount = Math.floor(Math.random() * (numCards - 1)) + 1;  // Random spin distance, ensuring we don't go past the cards

        // Apply the animation (scrolling the card-container)
        setTimeout(() => {
            cardContainer.style.transition = `${spinDuration}s ease-out`;  // Re-enable the transition with smooth easing
            cardContainer.style.transform = `translateX(-${spinAmount * 120}px)`;  // Move the cards left by `spinAmount` units
        }, 100);  // Delay the transform change to make sure the reset happens

        // After the spin ends, show the final "stopped" card
        setTimeout(() => {
            const finalCard = randomCards[Math.floor(Math.random() * numCards)];  // Select a random final card
            showFinalCard(finalCard);

            // Add the final card to the inventory
            addCardToInventory(finalCard);

            // Remove the tab and reset the spinning flag
            tab.remove();
            isSpinning = false;
        }, spinDuration * 1000);  // Wait until the animation is done before selecting a final card
    })
    .catch(err => {
        console.error('Error spinning:', err);
        isSpinning = false;  // Reset spinning flag on error
    });
}

// Get Random Cards (select a few cards to spin through)
function getRandomCards(cards) {
    const randomCards = [];
    const numberOfCards = 10;  // How many cards to show in the "slot machine"

    for (let i = 0; i < numberOfCards; i++) {
        const randomIndex = Math.floor(Math.random() * cards.length);
        randomCards.push(cards[randomIndex]);
    }

    return randomCards;
}

// Show Final Card (after spinning ends)
function showFinalCard(card) {
    const cardContainer = document.getElementById('slot-machine').querySelector('.card-container');
    cardContainer.innerHTML = '';  // Clear previous cards

    // Set the background color based on rarity
    const rarityColor = getRarityColor(card.rarity);
    const finalCardElement = document.createElement('div');
    finalCardElement.classList.add('card');
    finalCardElement.style.borderLeft = `10px solid ${rarityColor}`;
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
    cardContainer.appendChild(finalCardElement);
}