import { Client, Users, Databases } from 'node-appwrite';

export default async ({ req, res }) => {
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);
  try {
    console.log("Received request:", req);

    // Extract payload safely from the nested request structure
    const payload = req.bodyJson || JSON.parse(req.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameId, eventIndex, userId } = payload;
    if (!gameId || eventIndex === undefined || !userId) {
      return res.json({
        success: false,
        error: 'Missing parameters: gameId, eventIndex, and userId are required.'
      });
    }

    // Validate eventIndex is a number
    if (typeof eventIndex !== 'number' || eventIndex < 0) {
      return res.json({
        success: false,
        error: 'eventIndex must be a non-negative number.'
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
        error: 'Game not found.'
      });
    }

    // Validate game is in started status
    if (game.status !== 'started') {
      return res.json({
        success: false,
        error: 'Game must be started to vote.'
      });
    }

    // Process players array
    console.log("Game players:", game.players);
    
    // Fix: Check if the user is in the game by session ID from the headers
    // or use the userId from the payload as a fallback
    const sessionId = req.headers['x-appwrite-user-jwt'] 
      ? JSON.parse(Buffer.from(req.headers['x-appwrite-user-jwt'].split('.')[1], 'base64').toString()).sessionId
      : null;
    
    console.log("User ID from payload:", userId);
    console.log("Session ID from JWT:", sessionId);
    
    // Process and update the players array
    let players = [];
    let currentPlayerIndex = -1;
    let userExists = false;
    
    // Parse the players array and identify the current player
    for (let i = 0; i < game.players.length; i++) {
      const playerJson = game.players[i];
      try {
        const player = typeof playerJson === 'string' ? JSON.parse(playerJson) : playerJson;
        console.log("Checking player:", player);
        
        // Initialize ticked array if it doesn't exist
        if (!player.ticked) {
          player.ticked = [];
        }
        
        // Check if this is the current player
        if (player.userId === userId || 
            player.sessionId === userId ||
            player.userId === sessionId || 
            (sessionId && player.sessionId === sessionId)) {
          userExists = true;
          currentPlayerIndex = i;
          
          // Check if the event is already ticked for this player
          if (player.ticked.includes(eventIndex)) {
            return res.json({
              success: false,
              error: 'You have already voted for this event.'
            });
          }
          
          // Add event to player's ticked array
          player.ticked.push(eventIndex);
        }
        
        // Add the processed player to the new array
        players.push(typeof playerJson === 'string' ? JSON.stringify(player) : player);
      } catch (e) {
        console.error("Error processing player:", e);
        players.push(playerJson); // Keep original player data if processing fails
      }
    }
    
    if (!userExists) {
      return res.json({
        success: false,
        error: 'User is not a participant in this game.'
      });
    }
    
    if (currentPlayerIndex === -1) {
      return res.json({
        success: false,
        error: 'Failed to identify current player in the game.'
      });
    }

    // Validate eventIndex is within bounds
    if (eventIndex >= game.events?.length) {
      return res.json({
        success: false,
        error: 'Invalid event index.'
      });
    }

    console.log("User validation passed, processing vote");

    // Calculate votes for this event based on player ticks
    const voteCounts = new Array(game.events.length).fill(0);
    
    // Count votes for each event
    for (const playerData of players) {
      try {
        const player = typeof playerData === 'string' ? JSON.parse(playerData) : playerData;
        if (player.ticked && Array.isArray(player.ticked)) {
          for (const tickedIndex of player.ticked) {
            if (typeof tickedIndex === 'number' && tickedIndex >= 0 && tickedIndex < voteCounts.length) {
              voteCounts[tickedIndex]++;
            }
          }
        }
      } catch (e) {
        console.error("Error counting votes:", e);
      }
    }
    
    // Determine required votes based on the threshold percentage
    const totalPlayers = players.length;
    const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);

    // Get existing verified events or initialize
    let verifiedEvents = game.verifiedEvents || [];
    
    // If vote count meets the threshold, mark as verified
    if (voteCounts[eventIndex] >= requiredVotes && !verifiedEvents.includes(eventIndex)) {
      verifiedEvents.push(eventIndex);
    }

    console.log(`Vote count: ${voteCounts[eventIndex]}/${requiredVotes}, verified: ${verifiedEvents.includes(eventIndex)}`);
    console.log(`Updated player's ticked events:`, 
      typeof players[currentPlayerIndex] === 'string' 
        ? JSON.parse(players[currentPlayerIndex]).ticked 
        : players[currentPlayerIndex].ticked
    );
    
    // Update the document
    try {
      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        { 
          players,
          votes: voteCounts, 
          verifiedEvents
        }
      );

      console.log("Updated game document successfully");
      return res.json({ 
        success: true, 
        game: updatedGame,
        voteCount: voteCounts[eventIndex],
        requiredVotes,
        verified: verifiedEvents.includes(eventIndex)
      });
    } catch (updateError) {
      console.error("Error updating document:", updateError);
      if (updateError.code === 409) {
        return res.json({
          success: false,
          error: 'Game was modified by another player. Please try again.'
        });
      }
      throw updateError;
    }

  } catch (error) {
    console.error("Error in voteEventFunction:", error);
    return res.json({
      success: false,
      error: error.message || "Unknown error occurred"
    });
  }
};
