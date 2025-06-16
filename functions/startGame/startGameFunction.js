import { Client, Databases } from 'node-appwrite';

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new Databases(client);

// Fisher-Yates shuffle algorithm for truly random event selection
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a random board for a player, ensuring no duplicate events
function generateRandomBoard(events, boardSize, addFreeSpace, existingBoards = []) {
  const totalCells = boardSize * boardSize;
  const centerIndex = Math.floor(totalCells / 2);
  let eventsNeeded = addFreeSpace ? totalCells - 1 : totalCells;
  
  // If we don't have enough events, we can't make a unique board
  if (events.length < eventsNeeded) {
    throw new Error(`Not enough events to create a unique board. Need ${eventsNeeded}, have ${events.length}.`);
  }
  
  // Create a board with selected events (flatten representation)
  let boardEvents;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loops
  
  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    
    // Shuffle events to get a random selection
    const shuffledEvents = shuffleArray(events);
    
    // Take required number of events, ensuring no duplicates
    const selectedEvents = [];
    for (let i = 0; i < shuffledEvents.length && selectedEvents.length < eventsNeeded; i++) {
      if (!selectedEvents.includes(shuffledEvents[i])) {
        selectedEvents.push(shuffledEvents[i]);
      }
    }
    
    // If we still don't have enough unique events, try again
    if (selectedEvents.length < eventsNeeded) {
      continue;
    }
    
    // Insert free space in the center if needed
    boardEvents = [];
    if (addFreeSpace) {
      // Create a complete board with free space
      for (let i = 0; i < totalCells; i++) {
        if (i === centerIndex) {
          boardEvents.push("FREE_SPACE"); // Special marker for free space
        } else {
          // Adjust the index based on whether we've passed the center
          const eventIndex = i < centerIndex ? i : i - 1;
          boardEvents.push(selectedEvents[eventIndex]);
        }
      }
    } else {
      boardEvents = [...selectedEvents];
    }
    
    // Convert to string representation for comparison
    const boardStr = JSON.stringify(boardEvents);
    
    // Check against existing boards to ensure uniqueness
    isUnique = !existingBoards.some(board => JSON.stringify(board) === boardStr);
  }
  
  if (!isUnique) {
    console.warn(`Could not generate a unique board after ${maxAttempts} attempts. Some boards may be similar.`);
  }
  
  // Convert flat board to 2D layout
  const board = [];
  for (let row = 0; row < boardSize; row++) {
    const rowArray = [];
    for (let col = 0; col < boardSize; col++) {
      const index = row * boardSize + col;
      rowArray.push(boardEvents[index]);
    }
    board.push(rowArray);
  }
  
  return { board, boardEvents };
}

export default async ({ req, res, context }) => {
  try {
    // Extract payload and user ID from headers
    const payload = req?.bodyJson || JSON.parse(req?.body || '{}');
    context.log('Received payload:', payload);

    const userId = req.headers['x-appwrite-user-id'];
    const { gameId } = payload;

    if (!gameId) {
      return res.json({
        success: false,
        error: 'Missing required parameter: gameId'
      });
    }

    if (!userId) {
      return res.json({
        success: false,
        error: 'User ID not found in request headers'
      });
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    if (!game) {
      return res.json({
        success: false,
        error: 'Game not found'
      });
    }

    // Verify the user is the host
    if (game.host !== userId) {
      return res.json({
        success: false,
        error: 'Only the host can start the game'
      });
    }

    if (game.status !== 'waiting') {
      return res.json({
        success: false,
        error: 'Game cannot be started from its current state'
      });
    }

    // Generate boards for all players if randomizeBoards is enabled or if addFreeSpace is enabled
    const randomizeBoards = game.randomizeBoards || false;
    const addFreeSpace = game.addFreeSpace || false;
    const boardSize = parseInt(game.boardSize);
    const freeSpaceText = game.freeSpaceText || "FREE SPACE";
    
    // Check if we need to generate custom boards
    const needCustomBoards = randomizeBoards || addFreeSpace;
    
    if (needCustomBoards) {
      const players = game.players || [];
      const updatedPlayers = [];
      const existingBoards = []; // Track boards to ensure uniqueness

      for (let i = 0; i < players.length; i++) {
        try {
          // Parse player data
          const playerData = typeof players[i] === 'string' 
            ? JSON.parse(players[i]) 
            : players[i];
          
          context.log(`Generating board for player ${playerData.username}`);
          
          // Generate a unique random board for this player
          const { board, boardEvents } = generateRandomBoard(
            game.events, 
            boardSize,
            addFreeSpace,
            existingBoards
          );
          
          // Store the generated board in the player object
          const updatedPlayer = {
            ...playerData,
            board: board,
            boardEvents: boardEvents,
            ticked: [] // Reset ticked events
          };
          
          // Track this board to ensure others are unique
          existingBoards.push(boardEvents);
          
          // Add updated player back to array
          updatedPlayers.push(JSON.stringify(updatedPlayer));
        } catch (e) {
          console.log(`Error processing player ${i}:`, e);
          updatedPlayers.push(players[i]); // Keep original if there's an error
        }
      }
      
      // Initialize verifiedEvents as an empty array (with correct string type)
      const verifiedEvents = [];
      
      // Update the game with updated players and free space text
      const updateData = { 
        status: 'started',
        players: updatedPlayers,
        verifiedEvents: verifiedEvents
      };
      
      if (addFreeSpace) {
        updateData.freeSpaceText = freeSpaceText;
      }
      
      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        updateData
      );

      return res.json({
        success: true,
        game: updatedGame,
        message: 'Game started with custom boards generated for each player'
      });
    } else {
      // Standard game start without custom boards
      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        { 
          status: 'started',
          verifiedEvents: [] // Initialize as empty array
        }
      );

      return res.json({
        success: true,
        game: updatedGame,
        message: 'Game started with standard boards'
      });
    }
  } catch (error) {
    console.log('Error in startGameFunction:', error);
    return res.json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
};