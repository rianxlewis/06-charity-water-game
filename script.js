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

// Sound System
let audioEnabled = true;
const sounds = {
  collect: null,
  hill: null,
  rock: null,
  snake: null,
  thermometer: null,
  win: null,
  lose: null,
  choice: null,
  milestone: null
};

// Initialize sound system
function initializeSounds() {
  try {
    // Use Audio objects for each sound file
    sounds.collect = new Audio('sounds/water.mp3');
    sounds.hill = new Audio('sounds/hill.mp3');
    sounds.rock = new Audio('sounds/rock.mp3');
    sounds.snake = new Audio('sounds/snake.mp3');
    sounds.thermometer = new Audio('sounds/heat.mp3');
    sounds.win = new Audio('sounds/win.mp3');
    sounds.lose = new Audio('sounds/lose.mp3');
    sounds.choice = new Audio('sounds/choice.mp3');
    sounds.milestone = new Audio('sounds/milestone.mp3');

    // Set volume levels for all sounds
    Object.values(sounds).forEach(sound => {
      if (sound) {
        sound.volume = 0.3;
      }
    });
  } catch (error) {
    console.log('Audio initialization failed:', error);
    audioEnabled = false;
  }
}

// Play a sound by name
function playSound(soundName) {
  if (!audioEnabled || !sounds[soundName]) return;

  try {
    sounds[soundName].currentTime = 0;
    sounds[soundName].play().catch(e => {
      console.log('Sound play failed:', e);
    });
  } catch (error) {
    console.log('Sound play error:', error);
  }
}

// Milestone System
let milestones = [
  {
    id: 'noon',
    triggered: false,
    condition: () => gameTime.hours >= 12,
    message: '🕛 NOON MILESTONE 🕛\n\nIt\'s already noon and you\'re still walking.\n\nFact: The average distance to a water source in rural areas is 6 kilometers.',
    type: 'time'
  },
  {
    id: 'afternoon',
    triggered: false,
    condition: () => gameTime.hours >= 15,
    message: '🕒 LATE AFTERNOON 🕒\n\nTime is running short - sunset approaches.\n\nFact: 1 in 4 health care facilities worldwide lack basic water services.',
    type: 'time'
  },
  {
    id: 'evening',
    triggered: false,
    condition: () => gameTime.hours >= 18,
    message: '🌅 EVENING APPROACHES 🌅\n\nDanger increases as darkness falls.\n\nFact: When water is not available on premises, women and girls bear primary responsibility for water collection.',
    type: 'time'
  }
];

function checkMilestones() {
  milestones.forEach(milestone => {
    if (!milestone.triggered && milestone.condition()) {
      milestone.triggered = true;
      showMilestone(milestone.message);
      playSound('milestone');
    }
  });
}

function showMilestone(message) {
  const milestoneContainer = document.getElementById('milestoneContainer');
  const milestoneMessage = document.getElementById('milestoneMessage');
  
  // Show milestone message
  milestoneMessage.textContent = message;
  milestoneMessage.classList.add('show');
  
  // Hide after 4 seconds
  setTimeout(() => {
    milestoneMessage.classList.remove('show');
    milestoneMessage.classList.add('hide');
    
    // Clean up after animation
    setTimeout(() => {
      milestoneMessage.classList.remove('hide');
    }, 400);
  }, 4000);
}

// Difficulty settings
let difficulty = 'normal'; // Default difficulty
let difficultySettings = {
  easy: {
    timeMultiplier: 0.8,     // Slower time progression
    staminaDrainRate: 0.8,   // Slower stamina loss over time
    penaltyMultiplier: 0.8,  // Reduced penalties
    label: 'Easy'
  },
  normal: {
    timeMultiplier: 1,       // Normal time progression  
    staminaDrainRate: 1,     // Normal stamina loss over time
    penaltyMultiplier: 1,    // Normal penalties
    label: 'Normal'
  },
  hard: {
    timeMultiplier: 1.3,     // Faster time progression
    staminaDrainRate: 1.2,   // Faster stamina loss over time
    penaltyMultiplier: 1.5,  // Increased penalties
    label: 'Hard'
  }
};

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

// Choice options for obstacles
const obstacleChoices = {
  "img/hill.png": {
    title: "Steep Hill Ahead",
    scenario: "A large hill blocks your path. You can climb over it directly or take the longer route around it.",
    options: [
      {
        title: "Climb Over Hill",
        description: "Go straight over the hill. Steep climb that will exhaust you but saves time.",
        effects: { stamina: -15, water: 0, time: 10 }
      },
      {
        title: "Walk Around Hill",
        description: "Take the longer path around the hill. Easier on your body but takes much more time.",
        effects: { stamina: -5, water: 0, time: 25 }
      }
    ]
  },
  "img/rock.png": {
    title: "Rocky Terrain",
    scenario: "Sharp rocks cover the path ahead. You can carefully navigate through them or try to rush across.",
    options: [
      {
        title: "Navigate Carefully",
        description: "Pick your way slowly through the rocks. Safer but takes more time.",
        effects: { stamina: -5, water: -2, time: 15 }
      },
      {
        title: "Rush Across",
        description: "Run quickly across the rocky terrain. Risk falling and spilling water.",
        effects: { stamina: -10, water: -5, time: 5 }
      }
    ]
  },
  "img/snake.png": {
    title: "Dangerous Snake",
    scenario: "A venomous snake blocks your path. You must decide how to handle this deadly encounter.",
    options: [
      {
        title: "Try to Scare It",
        description: "Make noise and throw rocks to scare the snake away. Risky but faster.",
        effects: { stamina: -20, water: 0, time: 10 }
      },
      {
        title: "Go Around Carefully",
        description: "Take a wide detour around the snake. Much safer but takes longer.",
        effects: { stamina: -8, water: 0, time: 20 }
      }
    ]
  },
  "img/thermometer.png": {
    title: "Scorching Heat",
    scenario: "The sun is blazing overhead with no shade in sight. You must decide how to handle this dangerous heat.",
    options: [
      {
        title: "Rest and Wait",
        description: "Stop and rest until the heat subsides. Preserves energy but loses precious time.",
        effects: { stamina: 5, water: -3, time: 30 }
      },
      {
        title: "Push Through Heat",
        description: "Keep walking despite the dangerous heat. Faster but risks heat exhaustion.",
        effects: { stamina: -15, water: -10, time: 0 }
      }
    ]
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
  
  // Jump time based on difficulty setting
  const timeIncrement = 2 * difficultySettings[difficulty].timeMultiplier;
  gameTime.minutes += timeIncrement;
  
  if (gameTime.minutes >= 60) {
    gameTime.minutes -= 60;
    gameTime.hours += 1;
  }

  // Change background to sunset at 6PM (18:00)
  if (gameTime.hours >= 18) {
    // Get the body element and add the 'sunset' class, remove 'daytime'
    document.body.classList.add('sunset');
    document.body.classList.remove('daytime');
  }

  // Handle stamina based on movement state and difficulty rates
  if (isMoving) {
    // Decrease stamina when moving (affected by difficulty drain rate)
    stamina -= STAMINA_DECREASE_RATE * difficultySettings[difficulty].staminaDrainRate;
    if (stamina < 0) stamina = 0;
  } else {
    // Slowly increase stamina when resting (affected by difficulty regen rate)
    stamina += STAMINA_INCREASE_RATE;
    if (stamina > 100) stamina = 100;
  }
  
  updateTimerDisplay();
  updateStaminaDisplay();
  checkMilestones(); // Check for milestone achievements
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
  const displayMinutes = Math.floor(minutes).toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

function checkGameEnd() {
  // Stop game at 8:00 PM (20:00) OR when stamina reaches 0
  if (gameTime.hours >= 20) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);

    playSound('lose');

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

    // Show the outcome in a centered div after a short delay
    setTimeout(() => {
      showEndOutcome(timeFailMessage);
    }, 200);

  } else if (stamina <= 0) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);

    playSound('lose');

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

    setTimeout(() => {
      showEndOutcome(staminaFailMessage);
    }, 200);
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
  lastTouchedObjectType = objectType; // Save for use in choice effects

  // Play the correct sound for each object type immediately when hit
  // Use .play() on a new Audio object each time to allow overlapping sounds
  if (objectType === "img/water-can-transparent.png") {
    // Water can sound
    new Audio('sounds/water.mp3').play();
  } else if (objectType === "img/hill.png") {
    // Hill sound
    new Audio('sounds/hill.mp3').play();
  } else if (objectType === "img/rock.png") {
    // Rock sound
    new Audio('sounds/rock.mp3').play();
  } else if (objectType === "img/snake.png") {
    // Snake sound
    new Audio('sounds/snake.mp3').play();
  } else if (objectType === "img/thermometer.png") {
    // Heat sound
    new Audio('sounds/heat.mp3').play();
  } else {
    playSound('obstacle');
  }

  // Mark object as touched so it doesn't trigger again
  obj.setAttribute('data-touched', 'true');
  
  // Visual feedback - object stays visible but gets a gray overlay
  obj.style.opacity = '0.5';
  obj.style.filter = 'grayscale(100%)';
  
  // Stop movement before showing choice
  stopMoving();
  rightKeyDown = false; // Reset key state
  gameActive = false; // Pause game during choice
  
  // Check if this obstacle has choices
  if (obstacleChoices[objectType]) {
    const choice = obstacleChoices[objectType];
    
    // Play choice sound
    playSound('choice');
    
    // Create urgency message based on current state
    let urgencyMessage = '';
    if (stamina < 30 && gameTime.hours >= 16) {
      urgencyMessage = '\n⚠️ CRITICAL: Low stamina + late hour = extremely dangerous\n';
    } else if (stamina < 50) {
      urgencyMessage = '\n⚠️ WARNING: Low stamina makes risky choices more dangerous\n';
    } else if (gameTime.hours >= 17) {
      urgencyMessage = '\n⏰ TIME PRESSURE: Getting late - every minute counts\n';
    }
    
    const decisionMessage = `🛤️ ${choice.title.toUpperCase()} 🛤️

${choice.scenario}${urgencyMessage}

Current Status:
• Stamina: ${Math.floor(stamina)}%
• Water: ${Math.floor(water)}%
• Time: ${formatTime(gameTime.hours, gameTime.minutes)}

Choose your approach:

1️⃣ ${choice.options[0].title}
${choice.options[0].description}

2️⃣ ${choice.options[1].title}
${choice.options[1].description}

Type "1" for first option, "2" for second option, or leave blank for random choice:`;

    let userChoice = prompt(decisionMessage);
    
    // Handle empty input (random choice)
    if (userChoice === null || userChoice.trim() === '') {
      userChoice = Math.random() < 0.5 ? '1' : '2';
      const selectedOption = choice.options[parseInt(userChoice) - 1];
      alert(`Random choice made: ${selectedOption.title}`);
      applyChoiceEffects(selectedOption);
    } else if (userChoice === '1' || userChoice === '2') {
      const selectedOption = choice.options[parseInt(userChoice) - 1];
      applyChoiceEffects(selectedOption);
    } else {
      // Invalid choice, reprompt with clarification
      alert('Please choose 1, 2, or leave blank for random choice');
      setTimeout(() => {
        applyObjectEffect(obj); // Retry the same object
      }, 100);
      return;
    }
  } else {
    // No choices for this object, use original effect
    applyOriginalEffect(objectType);
  }
  
  gameActive = true; // Resume game
}

// Function to apply choice effects
function applyChoiceEffects(option) {
  // Store old time for comparison
  const oldHours = gameTime.hours;
  const oldMinutes = Math.floor(gameTime.minutes);
  
  // Calculate actual effects with difficulty multipliers
  const penaltyMultiplier = difficultySettings[difficulty].penaltyMultiplier;
  
  const actualStaminaChange = option.effects.stamina * (option.effects.stamina < 0 ? penaltyMultiplier : 1);
  const actualWaterChange = option.effects.water * (option.effects.water < 0 ? penaltyMultiplier : 1);
  const actualTimeChange = option.effects.time * (option.effects.time > 0 ? penaltyMultiplier : 1);
  
  // Apply effects
  stamina += actualStaminaChange;
  water += actualWaterChange;
  gameTime.minutes += actualTimeChange;
  
  // Handle time overflow
  while (gameTime.minutes >= 60) {
    gameTime.minutes -= 60;
    gameTime.hours += 1;
  }
  
  // Clamp values
  if (stamina > 100) stamina = 100;
  if (stamina < 0) stamina = 0;
  if (water > 100) water = 100;
  if (water < 0) water = 0;
  
  // Update displays
  updateTimerDisplay();
  updateStaminaDisplay();
  updateWaterDisplay();
  
  // Check milestones after applying effects
  checkMilestones();
  
  // Check game end conditions immediately after choice effects
  if (stamina <= 0) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);

    playSound('lose');

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

    setTimeout(() => {
      showEndOutcome(staminaFailMessage);
    }, 200);
    return;
  }

  if (gameTime.hours >= 20) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);

    playSound('lose');

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

    setTimeout(() => {
      showEndOutcome(timeFailMessage);
    }, 200);
    return;
  }
  
  // Show result message
  const newHours = gameTime.hours;
  const newMinutes = Math.floor(gameTime.minutes);
  
  let resultMessage = `CHOICE RESULT:\n\n${option.title}`;
  
  if (actualStaminaChange !== 0) resultMessage += `\nStamina: ${actualStaminaChange > 0 ? '+' : ''}${Math.floor(actualStaminaChange)}`;
  if (actualWaterChange !== 0) resultMessage += `\nWater: ${actualWaterChange > 0 ? '+' : ''}${Math.floor(actualWaterChange)}`;
  if (actualTimeChange !== 0) {
    const oldTime = `${oldHours}:${oldMinutes.toString().padStart(2, '0')}`;
    const newTime = `${newHours}:${newMinutes.toString().padStart(2, '0')}`;
    resultMessage += `\nTime: ${oldTime} → ${newTime}`;
  }
  
  resultMessage += `\n\nCurrent Status:
• Stamina: ${Math.floor(stamina)}%
• Water: ${Math.floor(water)}%
• Time: ${formatTime(gameTime.hours, gameTime.minutes)}`;
  
  setTimeout(() => {
    alert(resultMessage);
  }, 100);
}

// Function to apply original effect (for water cans that don't have choices)
function applyOriginalEffect(objectType) {
  const effect = objectEffects[objectType];

  if (!effect) return;

  // Store old time for comparison (format properly with decimals)
  const oldHours = gameTime.hours;
  const oldMinutes = Math.floor(gameTime.minutes);
  const oldTime = `${oldHours}:${oldMinutes.toString().padStart(2, '0')}`;
  
  // Calculate actual effects with difficulty multipliers
  const penaltyMultiplier = difficultySettings[difficulty].penaltyMultiplier;
  
  const actualStaminaChange = effect.stamina * (effect.stamina > 0 ? 1 : penaltyMultiplier);
  const actualWaterChange = effect.water * (effect.water > 0 ? 1 : penaltyMultiplier);
  const actualTimeChange = effect.time * penaltyMultiplier;
  
  // Apply the calculated effects
  stamina += actualStaminaChange;
  water += actualWaterChange;
  gameTime.minutes += actualTimeChange;
  
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
  
  // Update displays immediately
  updateTimerDisplay();
  updateStaminaDisplay();
  updateWaterDisplay();
  
  // Check milestones after applying effects
  checkMilestones();
  
  // Check game end conditions immediately after applying effects
  if (stamina <= 0) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);

    playSound('lose');

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

    setTimeout(() => {
      showEndOutcome(staminaFailMessage);
    }, 200);
    return;
  }

  if (gameTime.hours >= 20) {
    gameActive = false;
    clearInterval(timerInterval);
    clearInterval(moveInterval);

    playSound('lose');

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

    setTimeout(() => {
      showEndOutcome(timeFailMessage);
    }, 200);
    return;
  }
  
  // Enhanced visual feedback for time penalties
  if (actualTimeChange > 0) {
    const timerElement = document.getElementById('timer');
    
    // Flash the timer red to show time penalty
    timerElement.style.backgroundColor = '#dc3545';
    timerElement.style.color = 'white';
    setTimeout(() => {
      timerElement.style.backgroundColor = '';
      timerElement.style.color = '';
    }, 1000);
    
    console.log(`Time penalty! ${oldTime} → ${newTime} (+${Math.floor(actualTimeChange)} minutes)`);
  }
  
  // Create difficulty-adjusted message
  let adjustedMessage = "";
  
  switch(objectType) {
    case "img/water-can-transparent.png":
      adjustedMessage = `Found water! +${Math.floor(actualStaminaChange)} stamina, +${Math.floor(actualWaterChange)} water`;
      break;
    case "img/hill.png":
      adjustedMessage = `Steep hill! ${Math.floor(actualStaminaChange)} stamina, +${Math.floor(actualTimeChange)} minutes`;
      break;
    case "img/rock.png":
      adjustedMessage = `Rocky terrain! ${Math.floor(actualStaminaChange)} stamina, ${Math.floor(actualWaterChange)} water, +${Math.floor(actualTimeChange)} minutes`;
      break;
    case "img/snake.png":
      adjustedMessage = `Snake encounter! ${Math.floor(actualStaminaChange)} stamina, +${Math.floor(actualTimeChange)} minutes`;
      break;
    case "img/thermometer.png":
      adjustedMessage = `Extreme heat! ${Math.floor(actualStaminaChange)} stamina, ${Math.floor(actualWaterChange)} water`;
      break;
    default:
      adjustedMessage = effect.message;
  }
  
  if (actualTimeChange > 0) {
    adjustedMessage += `\nTime changed from ${oldTime} to ${newTime}`;
  }
  
  // Show effect message
  console.log(adjustedMessage);
  
  // Brief alert for now
  setTimeout(() => {
    alert(adjustedMessage);
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

    playSound('win');
    new Audio('sounds/home.mp3').play();

    const timerElement = document.getElementById('timer');
    timerElement.style.backgroundColor = '#28a745';
    timerElement.style.color = 'white';
    timerElement.textContent = '🏠 You Made It Home!';

    house.style.transform = 'scale(1.2)';
    house.style.boxShadow = '0 0 20px #28a745';
    house.style.backgroundColor = 'rgba(40, 167, 69, 0.2)';

    let outcomeMessage = "Congratulations! You made it home!\n\n";

    if (water < 50) {
      outcomeMessage += `💧 WATER SHORTAGE 💧
You arrived with only ${Math.floor(water)}% water remaining.

Unfortunately, this isn't enough water for your entire family. Your children will have to go thirsty tonight, and tomorrow you'll need to make this dangerous journey again.

The lack of water means:
• Your family cannot cook a proper meal
• Personal hygiene becomes impossible
• Your children miss school due to dehydration
• You must choose between drinking water and sharing with your family`;
    } else {
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

    setTimeout(() => {
      showEndOutcome(outcomeMessage);
      console.log('Game won - reached the house!');
    }, 200);
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

// Only allow movement and timer after DOM and images are loaded
let gameReady = false;

// Wait for DOM and all images to load before enabling game
function setGameReady() {
  // Wait for DOMContentLoaded and all images (logo, clouds, player, etc.)
  const logoImg = document.querySelector('.cw-logo') || document.createElement('img');
  // If logo is not in DOM yet, fallback to checking window load
  if (logoImg.complete !== undefined && !logoImg.complete) {
    logoImg.onload = () => {
      gameReady = true;
    };
  } else {
    gameReady = true;
  }
}

// Prevent movement and timer until gameReady is true
function safeStartTimer() {
  if (!gameReady) {
    setTimeout(safeStartTimer, 50);
    return;
  }
  startTimer();
}

// Overwrite movement functions to check gameReady
function startMoving() {
  if (!gameActive || isPaused || !gameReady) return;
  if (moveInterval) return;
  isMoving = true;
  moveInterval = setInterval(movePlayer, 50);
}

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

moveButton.addEventListener('mousedown', () => { if (gameReady) startMoving(); });
moveButton.addEventListener('mouseup', stopMoving);
moveButton.addEventListener('mouseleave', stopMoving);
moveButton.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameReady) startMoving();
});
moveButton.addEventListener('touchend', stopMoving);
moveButton.addEventListener('touchcancel', stopMoving);

// Pause button event listener
pauseButton.addEventListener('click', togglePause);

// Keyboard controls
let rightKeyDown = false;

window.addEventListener('keydown', (event) => {
  if (!gameActive || !gameReady) return;
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

// Function to show the end outcome in a centered div (like milestone)
function showEndOutcome(message) {
  const endOutcomeContainer = document.getElementById('endOutcomeContainer');
  const endOutcomeMessage = document.getElementById('endOutcomeMessage');

  // Clear the outcome message div (logo removed)
  endOutcomeMessage.innerHTML = '';

  // Responsive message shortening
  let shortMsg = message;
  if (window.innerWidth <= 600) {
    if (message.includes('TOO LATE')) {
      shortMsg = "⏰ Too late! You didn't make it home before dark.\n\nThis is the daily reality for millions.";
    } else if (message.includes('COLLAPSED FROM EXHAUSTION')) {
      shortMsg = "😵 You collapsed from exhaustion.\n\nMany face this risk every day.";
    } else if (message.includes('Congratulations!')) {
      shortMsg = "🏠 You made it home!\n\nBut the water is still unsafe.";
    }
  } else if (window.innerWidth > 1023) {
    if (message.includes('TOO LATE')) {
      shortMsg = `⏰ TOO LATE! ⏰

You didn't make it home before dark. Now you face a terrible choice:

• Return home empty-handed, leaving your family without water
• Continue in dangerous darkness, risking attack or getting lost

Your family will go another day without clean water.

📊 THE HARSH REALITY 📊
This happens every day to millions of families worldwide.

🌍 MAKE A DIFFERENCE 🌍
Help ensure families have clean water close to home.

Learn more: https://www.charitywater.org

🔄 To play again, refresh this page.`;
    } else if (message.includes('COLLAPSED FROM EXHAUSTION')) {
      shortMsg = `😵 COLLAPSED FROM EXHAUSTION! 😵

Your body gave out during the journey. You collapsed miles from home.

Consequences:
• Risk of dehydration or heatstroke
• Danger from robbery or assault

📊 THE HARSH REALITY 📊
Millions face this daily risk walking hours for water.

🌍 MAKE A DIFFERENCE 🌍
Help bring clean water closer to communities.

Learn more: https://www.charitywater.org

🔄 To play again, refresh this page.`;
    } else if (message.includes('Congratulations!')) {
      shortMsg = `Congratulations! You made it home!

${message.includes('💧 WATER SHORTAGE 💧') ? `💧 WATER SHORTAGE 💧
You arrived with only ${Math.floor(water)}% water remaining.

Unfortunately, this isn't enough water for your entire family.
` : ''}

${message.includes('CONTAMINATED WATER') ? `The water you brought home is contaminated. Your family faces illness or must spend precious resources to make it safe.
` : ''}

📊 THE HARSH REALITY 📊
This is the daily reality for 2 billion people worldwide.

🌍 MAKE A DIFFERENCE 🌍
Learn more: https://www.charitywater.org

🔄 To play again, refresh this page.`;
    }
  }

  // Add the message
  const msgDiv = document.createElement('div');
  msgDiv.textContent = shortMsg;
  msgDiv.style.marginTop = "0.5rem";
  msgDiv.style.whiteSpace = "pre-line";
  endOutcomeMessage.appendChild(msgDiv);

  // Add the links at the bottom
  const linksDiv = document.createElement('div');
  linksDiv.style.marginTop = "1.2rem";
  linksDiv.style.display = "flex";
  linksDiv.style.flexDirection = "column";
  linksDiv.style.alignItems = "center";
  linksDiv.innerHTML = `
    <a href="https://www.charitywater.org" target="_blank" rel="noopener noreferrer" style="color:#2E9DF7; font-weight:bold; text-decoration:underline; margin-bottom:0.5rem; font-size:1.05em;">
      🌍 Learn More
    </a>
    <a href="https://www.charitywater.org/donate" target="_blank" rel="noopener noreferrer" style="color:#FFC907; font-weight:bold; text-decoration:underline; font-size:1.05em;">
      💧 Donate Now
    </a>
  `;
  endOutcomeMessage.appendChild(linksDiv);

  // Show the outcome container
  endOutcomeContainer.style.display = 'flex';
  endOutcomeMessage.classList.add('show');

  // Hide the message when the user clicks anywhere
  endOutcomeContainer.onclick = function() {
    endOutcomeContainer.style.display = 'none';
    endOutcomeMessage.classList.remove('show');
  };
}

// Function to show difficulty selection
function showDifficultySelection() {
  const difficultyMessage = `🎮 SELECT DIFFICULTY 🎮

Choose your challenge level:

🟢 EASY MODE:
• Slower time progression (80% speed)
• Slower stamina drain over time (80% rate)
• Faster stamina recovery when resting (130% rate)
• Reduced obstacle penalties (80% damage)

🟡 NORMAL MODE:
• Standard time progression
• Normal stamina drain and recovery
• Standard obstacle penalties
• Balanced experience

🔴 HARD MODE:
• Faster time progression (130% speed)
• Faster stamina drain over time (130% rate)
• Slower stamina recovery when resting (70% rate)
• Increased obstacle penalties (150% damage)

Type 'easy', 'normal', or 'hard' in the next prompt.`;

  alert(difficultyMessage);
  
  let selectedDifficulty;
  do {
    selectedDifficulty = prompt("Select difficulty: easy, normal, or hard").toLowerCase().trim();
  } while (!['easy', 'normal', 'hard'].includes(selectedDifficulty));
  
  difficulty = selectedDifficulty;
  
  alert(`Difficulty set to: ${difficultySettings[difficulty].label} Mode!`);
}

// Function to show game instructions
function showGameInstructions() {
  const instructions = `Welcome to "The Long Walk"!

CURRENT DIFFICULTY: ${difficultySettings[difficulty].label.toUpperCase()} MODE

HOW TO PLAY:
• Use the RIGHT ARROW KEY or MOVE BUTTON to walk
• Your goal: Reach the house (🏠) before 8:00 PM
• Manage your stamina, water, and time carefully

OBSTACLES:
• Water Can: +20 stamina, +30 water (Good!)
• Hill: Choice between climb over or walk around
• Rock: Choice between navigate carefully or rush across
• Snake: Choice between scare it or go around carefully
• Heat: Choice between rest and wait or push through

CONTROLS:
• RIGHT ARROW or MOVE BUTTON: Move forward
• P KEY or PAUSE BUTTON: Pause game
• Stop moving to slowly regain stamina

Good luck on your journey!`;

  alert(instructions);
}

// Generate objects and start timer when the page loads
window.addEventListener('DOMContentLoaded', () => {
  initializeSounds(); // Initialize sound system first
  showDifficultySelection(); // Show difficulty selection first
  showGameInstructions(); // Show instructions after difficulty is set
  generateRandomObjects();
  updateCamera(); // Set initial camera position
  setGameReady();
  safeStartTimer();
});