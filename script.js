// Log a message to the console to ensure the script is linked correctly
console.log('JavaScript file is linked correctly.');

const player = document.getElementById('player');
let playerWorldX = 0; // Player's position in the world (not screen position)
let cameraX = 0; // Camera's position in the world
let moveInterval; // Variable to hold the interval ID for moving the player
let moveStep; // Variable for movement speed
let gameActive = true; // Controls if the game is still active
let isMoving = false; // Track if player is currently moving
let isPaused = false; // Track if game is paused

// Timer variables
let gameTime = { hours: 8, minutes: 0 }; // Start at 8:00 AM
let timerInterval;

// Stamina variables
let stamina = 100; // Start at 100% stamina
const STAMINA_DECREASE_RATE = 1; // Stamina decreases by 1% every timer update when moving
const STAMINA_INCREASE_RATE = 0.5; // Stamina increases by 0.5% every timer update when resting

// Water variables
let water = 0; // Start with 0% water (need to collect from water source)
const WATER_DECREASE_RATE = 0.3; // Water slowly evaporates over time

let objects = ["img/hill.png", "img/rock.png", "img/snake.png", "img/thermometer.png", "img/water-can-transparent.png"]; // Array to hold objects in the game
let gameObjects = []; // Store references to generated objects

// Object effects mapping
const objectEffects = {
  "img/water-can-transparent.png": {
    stamina: 20,
    water: 30,
    time: 0,
    message: "Found water! +20 stamina, +30 water"
  },
  "img/hill.png": {
    stamina: -15,
    water: 0,
    time: 10, // 10 minutes lost
    message: "Steep hill! -15 stamina, +10 minutes"
  },
  "img/rock.png": {
    stamina: -10,
    water: -5,
    time: 5,
    message: "Rocky terrain! -10 stamina, -5 water, +5 minutes"
  },
  "img/snake.png": {
    stamina: -20,
    water: 0,
    time: 10,
    message: "Snake encounter! -20 stamina, +10 minutes"
  },
  "img/thermometer.png": {
    stamina: -5,
    water: -10,
    time: 0,
    message: "Extreme heat! -5 stamina, -10 water"
  }
};

// Camera settings - player screen position
let PLAYER_SCREEN_POSITION; // Where player stays on screen

// Function to update camera settings based on screen size
function updateCameraSettings() {
  if (window.innerWidth < 768) {
    PLAYER_SCREEN_POSITION = 100; // Player stays 100px from left edge
  } else if (window.innerWidth < 1024) {
    PLAYER_SCREEN_POSITION = 150; // Player stays 150px from left edge
  } else {
    PLAYER_SCREEN_POSITION = 200; // Player stays 200px from left edge
  }
}

// Timer functions
function startTimer() {
  timerInterval = setInterval(updateTimer, 200); // Update every 200ms
  updateTimerDisplay(); // Show initial time
  updateStaminaDisplay(); // Show initial stamina
  updateWaterDisplay(); // Show initial water
}

function updateTimer() {
  if (!gameActive || isPaused) return;
  
  // Jump 2 minutes every 100ms
  gameTime.minutes += 2;
  
  if (gameTime.minutes >= 60) {
    gameTime.minutes -= 60;
    gameTime.hours += 1;
  }
  
  // Handle stamina based on movement state
  if (isMoving) {
    // Decrease stamina when moving
    stamina -= STAMINA_DECREASE_RATE;
    if (stamina < 0) stamina = 0;
  } else {
    // Slowly increase stamina when resting (not moving)
    stamina += STAMINA_INCREASE_RATE;
    if (stamina > 100) stamina = 100;
  }
  
  updateTimerDisplay();
  updateStaminaDisplay();
  checkGameEnd();
}

function updateTimerDisplay() {
  const timerElement = document.getElementById('timer');
  const formattedTime = formatTime(gameTime.hours, gameTime.minutes);
  timerElement.textContent = `⏱ ${formattedTime}`;
}

function updateWaterDisplay() {
  const waterElement = document.getElementById('waterPercentage');
  waterElement.textContent = `${Math.floor(water)}%`;
  
  // Change color based on water level
  if (water <= 10) {
    waterElement.style.color = '#dc3545'; // Red when very low
  } else if (water <= 30) {
    waterElement.style.color = '#ffc107'; // Yellow when low
  } else {
    waterElement.style.color = '#007bff'; // Blue when adequate
  }
}

function updateStaminaDisplay() {
  const staminaElement = document.getElementById('staminaPercentage');
  staminaElement.textContent = `${Math.floor(stamina)}%`;
  
  // Change color based on stamina level
  if (stamina <= 20) {
    staminaElement.style.color = '#dc3545'; // Red when low
  } else if (stamina <= 50) {
    staminaElement.style.color = '#ffc107'; // Yellow when medium
  } else {
    staminaElement.style.color = '#28a745'; // Green when high
  }
  
  // Add visual indicator for resting vs moving
  const staminaGroup = document.getElementById('staminaGroup');
  if (!isMoving && gameActive && stamina < 100) {
    staminaGroup.style.backgroundColor = '#e8f5e8'; // Light green background when resting
  } else {
    staminaGroup.style.backgroundColor = 'transparent';
  }
}

function formatTime(hours, minutes) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

function checkGameEnd() {
  // Stop game at 8:00 PM (20:00) OR when stamina reaches 0
  if (gameTime.hours >= 20) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);
    
    // Visual feedback that game ended
    const timerElement = document.getElementById('timer');
    timerElement.style.backgroundColor = '#dc3545';
    timerElement.style.color = 'white';
    timerElement.textContent = '⏱ 8:00 PM - Too Late!';
    
    const timeFailMessage = `⏰ TOO LATE! ⏰

You didn't make it home before dark. Now you face a terrible choice:

• Return home empty-handed, leaving your family without water
• Continue in dangerous darkness, risking attack or getting lost
• Sleep outdoors and try again tomorrow

Your family will go another day without clean water.

📊 THE HARSH REALITY 📊
This happens every day to millions of families worldwide. When the water source is far away, even starting early sometimes isn't enough.

Many families send their children on these journeys, forcing them to miss school and risk their safety for something as basic as water.

🌍 MAKE A DIFFERENCE 🌍
Help ensure families have clean water close to home.

Learn more: https://www.charitywater.org

🔄 To play again, refresh this page.`;
    
    alert(timeFailMessage);
  } else if (stamina <= 0) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);
    
    // Visual feedback for stamina depletion
    const staminaElement = document.getElementById('staminaPercentage');
    const staminaGroup = document.getElementById('staminaGroup');
    staminaElement.textContent = '0% - Collapsed!';
    
    const staminaFailMessage = `😵 COLLAPSED FROM EXHAUSTION! 😵

Your body gave out during the journey. You collapsed miles from home.

Consequences:
• Risk of dehydration or heatstroke
• Danger from robbery or assault
• Your family doesn't know where you are
• No water for your family today

📊 THE HARSH REALITY 📊
Millions face this daily risk walking hours for water. Many collapse from exhaustion carrying loads too heavy for their bodies.

🌍 MAKE A DIFFERENCE 🌍
Help bring clean water closer to communities.

Learn more: https://www.charitywater.org

🔄 To play again, refresh this page.`;
    
    alert(staminaFailMessage);
  }
}

// Function to pause/unpause the game
function togglePause() {
  if (!gameActive) return; // Can't pause if game is over
  
  if (!isPaused) {
    // Currently not paused, so pause the game
    isPaused = true;
    stopMoving();
    rightKeyDown = false;
    alert('Game Paused');
    // After alert is dismissed, unpause
    isPaused = false;
  }
}

// Function to update movement speed based on screen width
function updateMoveStep() {
  if (window.innerWidth < 768) {
    moveStep = 8; // Mobile: increased from 5 to 8 (same as desktop)
  } else if (window.innerWidth < 1024) {
    moveStep = 5; // Tablet: medium
  } else {
    moveStep = 8; // Desktop: faster
  }
}

// Initialize settings
window.addEventListener('resize', () => {
  updateMoveStep();
  updateCameraSettings();
  updateCamera(); // Refresh camera position
});
updateMoveStep();
updateCameraSettings();

// Function to generate random objects
function generateRandomObjects() {
  const objectsContainer = document.getElementById('objects');
  const startPosition = 400; // Start objects 400px after player's initial position
  
  // Responsive spacing based on screen size and movement speed
  let spacing;
  if (window.innerWidth < 768) {
    spacing = 200; // Mobile: decreased from 250 to 200 (closer together)
  } else if (window.innerWidth < 1024) {
    spacing = 320; // Tablet: medium spacing
  } else {
    spacing = 400; // Desktop: original spacing
  }
  
  for (let i = 0; i < 10; i++) {
    // Create object element
    const objectElement = document.createElement('div');
    objectElement.className = 'game-object';
    objectElement.id = `object-${i}`;
    
    // Calculate world position for this object
    const objectWorldX = startPosition + (i * spacing);
    
    // Set object styles
    objectElement.style.position = 'fixed';
    objectElement.style.bottom = '20vh'; // Same height as player
    objectElement.style.width = '80px'; // Fixed width
    objectElement.style.height = '80px'; // Fixed height
    objectElement.style.zIndex = '9'; // Below player (player is z-index 10)
    
    // Check if this is the final object (house)
    if (i === 9) { // Last object is the house
      objectElement.textContent = '🏠'; // House emoji
      objectElement.style.fontSize = '60px';
      objectElement.style.display = 'flex';
      objectElement.style.alignItems = 'center';
      objectElement.style.justifyContent = 'center';
      objectElement.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      objectElement.style.borderRadius = '10px';
      objectElement.style.border = '3px solid #28a745';
      objectElement.setAttribute('data-object-type', 'house');
      console.log(`Generated HOUSE at world position ${objectWorldX}px (spacing: ${spacing}px)`);
    } else {
      // Randomly select an object from the array for other objects
      const randomObjectIndex = Math.floor(Math.random() * objects.length);
      const selectedObject = objects[randomObjectIndex];
      
      objectElement.style.backgroundImage = `url('${selectedObject}')`;
      objectElement.style.backgroundSize = 'cover';
      objectElement.style.backgroundPosition = 'center';
      objectElement.style.backgroundRepeat = 'no-repeat';
      objectElement.setAttribute('data-object-type', selectedObject);
      console.log(`Generated object ${i + 1}: ${selectedObject} at world position ${objectWorldX}px`);
    }
    
    // Add data attributes for game logic
    objectElement.setAttribute('data-object-index', i);
    objectElement.setAttribute('data-world-x', objectWorldX);
    
    // Store reference and append to container
    gameObjects.push(objectElement);
    objectsContainer.appendChild(objectElement);
  }
  
  console.log(`Total distance to house: ${startPosition + (9 * spacing)}px with ${spacing}px spacing`);
}

// Function to check for object collisions
function checkObjectCollisions() {
  gameObjects.forEach(obj => {
    // Skip if object is already touched or is the house
    if (obj.getAttribute('data-touched') === 'true' || obj.getAttribute('data-object-type') === 'house') {
      return;
    }
    
    const objectWorldX = parseInt(obj.getAttribute('data-world-x'));
    const objectScreenX = objectWorldX - cameraX;
    
    // Check if object is touching the player (within collision range)
    const collisionRange = 60; // Generous collision detection
    if (objectScreenX <= PLAYER_SCREEN_POSITION + collisionRange && objectScreenX >= PLAYER_SCREEN_POSITION - 20) {
      // Collision detected! Apply object effect
      applyObjectEffect(obj);
    }
  });
}

// Function to apply object effects
function applyObjectEffect(obj) {
  const objectType = obj.getAttribute('data-object-type');
  const effect = objectEffects[objectType];
  
  if (!effect) return;
  
  // Mark object as touched so it doesn't trigger again
  obj.setAttribute('data-touched', 'true');
  
  // Store old time for comparison (format properly with decimals)
  const oldHours = gameTime.hours;
  const oldMinutes = Math.floor(gameTime.minutes);
  const oldTime = `${oldHours}:${oldMinutes.toString().padStart(2, '0')}`;
  
  // Apply effects
  stamina += effect.stamina;
  water += effect.water;
  
  // Add time penalty (convert to same decimal system as timer)
  gameTime.minutes += effect.time;
  
  // Handle time overflow properly
  while (gameTime.minutes >= 60) {
    gameTime.minutes -= 60;
    gameTime.hours += 1;
  }
  
  // Calculate new time for display
  const newHours = gameTime.hours;
  const newMinutes = Math.floor(gameTime.minutes);
  const newTime = `${newHours}:${newMinutes.toString().padStart(2, '0')}`;
  
  // Clamp values to valid ranges
  if (stamina > 100) stamina = 100;
  if (stamina < 0) stamina = 0;
  if (water > 100) water = 100;
  if (water < 0) water = 0;
  
  // Visual feedback - object stays visible but gets a gray overlay
  obj.style.opacity = '0.5';
  obj.style.filter = 'grayscale(100%)';
  
  // Update displays immediately
  updateTimerDisplay();
  updateStaminaDisplay();
  updateWaterDisplay();
  
  // Enhanced visual feedback for time penalties
  if (effect.time > 0) {
    const timerElement = document.getElementById('timer');
    
    // Flash the timer red to show time penalty
    timerElement.style.backgroundColor = '#dc3545';
    timerElement.style.color = 'white';
    setTimeout(() => {
      timerElement.style.backgroundColor = '';
      timerElement.style.color = '';
    }, 1000);
    
    console.log(`Time penalty! ${oldTime} → ${newTime} (+${effect.time} minutes)`);
  }
  
  // Create a more detailed message showing the actual effects
  let detailedMessage = effect.message;
  if (effect.time > 0) {
    detailedMessage += `\nTime changed from ${oldTime} to ${newTime}`;
  }
  
  // Show effect message
  console.log(detailedMessage);
  
  // Stop movement before showing alert to prevent stuck key issue
  stopMoving();
  rightKeyDown = false; // Reset key state
  
  // Brief alert for now
  setTimeout(() => {
    alert(detailedMessage);
  }, 100);
}

function checkWinCondition() {
  const house = gameObjects.find(obj => obj.getAttribute('data-object-type') === 'house');
  if (!house) return;
  
  const houseWorldX = parseInt(house.getAttribute('data-world-x'));
  const houseScreenX = houseWorldX - cameraX; // House's current screen position
  
  // Player is at PLAYER_SCREEN_POSITION on screen
  // Check if house has reached the player's screen position (collision)
  if (houseScreenX <= PLAYER_SCREEN_POSITION + 40) { // 40px buffer for touch detection
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);
    
    // Visual feedback for winning
    const timerElement = document.getElementById('timer');
    timerElement.style.backgroundColor = '#28a745';
    timerElement.style.color = 'white';
    timerElement.textContent = '🏠 You Made It Home!';
    
    // Make house glow/celebrate
    house.style.transform = 'scale(1.2)';
    house.style.boxShadow = '0 0 20px #28a745';
    house.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';
    
    // Determine outcome based on water level
    let outcomeMessage = "Congratulations! You made it home!\n\n";
    
    if (water < 50) {
      // Not enough water scenario
      outcomeMessage += `💧 WATER SHORTAGE 💧
You arrived with only ${Math.floor(water)}% water remaining.

Unfortunately, this isn't enough water for your entire family. Your children will have to go thirsty tonight, and tomorrow you'll need to make this dangerous journey again.

The lack of water means:
• Your family cannot cook a proper meal
• Personal hygiene becomes impossible
• Your children miss school due to dehydration
• You must choose between drinking water and sharing with your family`;
    } else {
      // Has water but it's contaminated
      const contaminationOutcomes = [
        `🦠 CONTAMINATED WATER - MEDICAL CRISIS 🦠
You brought home ${Math.floor(water)}% water, but it was contaminated with bacteria.

Your youngest child drinks the water and becomes seriously ill with diarrhea and fever. You must:
• Spend your family's savings on medical treatment
• Miss work to care for your sick child
• Watch helplessly as they suffer from preventable illness
• Risk losing your job due to missed days`,

        `🔥 CONTAMINATED WATER - FUEL CRISIS 🔥
You brought home ${Math.floor(water)}% water, but it was contaminated with parasites.

To make it safe, you must boil all the water, which:
• Uses up your expensive cooking fuel for the week
• Means no money left for fuel to cook food
• Forces your family to eat raw or cold meals
• Creates dangerous fumes in your small home`,

        `😷 CONTAMINATED WATER - FAMILY ILLNESS 😷
You brought home ${Math.floor(water)}% water, but it was contaminated with harmful bacteria.

Multiple family members become sick after drinking it:
• Your spouse is too ill to work, losing vital income
• Your children miss school for days
• Medical bills drain your emergency savings
• The cycle of poverty deepens as illness leads to lost opportunities`
      ];
      
      const randomOutcome = contaminationOutcomes[Math.floor(Math.random() * contaminationOutcomes.length)];
      outcomeMessage += randomOutcome;
    }
    
    outcomeMessage += `

📊 THE HARSH REALITY 📊
This is the daily reality for 2 billion people worldwide. Every day, millions of women and children make dangerous journeys like this one, only to collect water that makes their families sick.

Diarrheal diseases from contaminated water kill more children than AIDS, malaria, and measles combined.

🌍 MAKE A DIFFERENCE 🌍
You can help change this story for real families.

Learn more: https://www.charitywater.org

🔄 To play again, refresh this page.`;
    
    alert(outcomeMessage);
    console.log('Game won - reached the house!');
  }
}

function updateCamera() {
  // Player always stays at fixed screen position
  player.style.left = `${PLAYER_SCREEN_POSITION}px`;
  player.style.transform = 'translateX(0px)';
  
  // World always moves based on player's world position
  cameraX = playerWorldX;
  
  // Update all game objects based on camera position
  gameObjects.forEach(obj => {
    const worldX = parseInt(obj.getAttribute('data-world-x'));
    const screenX = worldX - cameraX;
    obj.style.left = `${screenX}px`;
  });
  
  // Update background with parallax
  updateBackgroundParallax();
}

// Function to handle background parallax movement
function updateBackgroundParallax() {
  const clouds = document.querySelectorAll('.cloud');
  
  // Move clouds very slowly - much slower than before
  const parallaxOffset = playerWorldX * 0.05; // Very slow movement (5% of player movement)
  
  // Move clouds with slight variations for depth
  clouds.forEach((cloud, index) => {
    const cloudParallax = parallaxOffset * (0.8 + index * 0.1); // Slight variation per cloud
    cloud.style.transform = `translateX(-${cloudParallax}px)`;
  });
  
  // Sun stays fixed in the sky (no movement)
}

// Function to start moving
function startMoving() {
  if (!gameActive || isPaused) return;
  if (moveInterval) return; // Already moving
  
  isMoving = true;
  moveInterval = setInterval(movePlayer, 50);
}

// Function to stop moving
function stopMoving() {
  isMoving = false;
  clearInterval(moveInterval);
  moveInterval = null;
}

// Function to move the player
function movePlayer() {
  if (!gameActive || isPaused) {
    stopMoving();
    return;
  }
  
  playerWorldX += moveStep; // Move player in world coordinates
  updateCamera(); // Update camera and all positions
  checkObjectCollisions(); // Check for object collisions
  checkWinCondition(); // Check if player has reached the house
}

// Button event listeners
const moveButton = document.getElementById('moveButton');
const pauseButton = document.getElementById('pauseButton');

moveButton.addEventListener('mousedown', startMoving);
moveButton.addEventListener('mouseup', stopMoving);
moveButton.addEventListener('mouseleave', stopMoving);
moveButton.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent scrolling on mobile
  startMoving();
});
moveButton.addEventListener('touchend', stopMoving);
moveButton.addEventListener('touchcancel', stopMoving);

// Pause button event listener
pauseButton.addEventListener('click', togglePause);

// Keyboard controls
let rightKeyDown = false;

window.addEventListener('keydown', (event) => {
  if (!gameActive) return;
  if (event.key === 'ArrowRight' && !rightKeyDown) {
    rightKeyDown = true;
    startMoving();
  }
  if (event.key === 'p' || event.key === 'P') {
    togglePause();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowRight') {
    rightKeyDown = false;
    stopMoving();
  }
});

// Fix for alert stealing focus - reset movement when page loses/gains focus
window.addEventListener('blur', () => {
  // Page lost focus (alert opened) - stop movement and reset key state
  rightKeyDown = false;
  stopMoving();
});

window.addEventListener('focus', () => {
  // Page regained focus (alert closed) - make sure movement is stopped
  rightKeyDown = false;
  stopMoving();
});

// Function to show game instructions
function showGameInstructions() {
  const instructions = `Welcome to "The Long Walk"!

HOW TO PLAY:
• Use the RIGHT ARROW KEY or MOVE BUTTON to walk
• Your goal: Reach the house (🏠) before 8:00 PM
• Manage your stamina, water, and time carefully

OBSTACLES:
• Water Can: +20 stamina, +30 water (Good!)
• Hill: -15 stamina, +10 minutes (Tiring climb)
• Rock: -10 stamina, -5 water, +5 minutes (Rough terrain)
• Snake: -20 stamina, +10 minutes (Dangerous!)
• Heat: -5 stamina, -10 water (Dehydration)

CONTROLS:
• RIGHT ARROW or MOVE BUTTON: Move forward
• P KEY or PAUSE BUTTON: Pause game
• Stop moving to slowly regain stamina

Good luck on your journey!`;

  alert(instructions);
}

// Generate objects and start timer when the page loads
window.addEventListener('DOMContentLoaded', () => {
  showGameInstructions(); // Show instructions first
  generateRandomObjects();
  updateCamera(); // Set initial camera position
  startTimer(); // Start the game timer
});