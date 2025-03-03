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

    // Process players - fix user validation by using session ID
    console.log("Game players:", game.players);
    
    // Fix: Check if the user is in the game by session ID from the headers
    // or use the userId from the payload as a fallback
    const sessionId = req.headers['x-appwrite-user-jwt'] 
      ? JSON.parse(Buffer.from(req.headers['x-appwrite-user-jwt'].split('.')[1], 'base64').toString()).sessionId
      : null;
    
    console.log("User ID from payload:", userId);
    console.log("Session ID from JWT:", sessionId);
    
    // Initialize a flag to check if the user exists
    let userExists = false;
    
    // Loop through players and check both userId and sessionId
    for (const playerJson of game.players) {
      try {
        const player = typeof playerJson === 'string' ? JSON.parse(playerJson) : playerJson;
        console.log("Checking player:", player);
        
        // Accept either userId or sessionId match
        if (player.userId === userId || 
            player.sessionId === userId ||
            player.userId === sessionId || 
            (sessionId && player.sessionId === sessionId)) {
          userExists = true;
          break;
        }
      } catch (e) {
        console.error("Error parsing player:", e);
      }
    }
    
    if (!userExists) {
      return res.json({
        success: false,
        error: 'User is not a participant in this game.'
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

    // Handle duplicate votes with userVotes tracking
    let userVotes = {};
    try {
      userVotes = game.userVotes ? 
        (typeof game.userVotes === 'string' ? JSON.parse(game.userVotes) : game.userVotes) : {};
    } catch (e) {
      console.error("Error parsing userVotes:", e);
      userVotes = {};
    }
    
    // Initialize event votes array if not exists
    if (!userVotes[eventIndex]) {
      userVotes[eventIndex] = [];
    }
    
    // Check if this user already voted
    if (userVotes[eventIndex].includes(userId) || 
        (sessionId && userVotes[eventIndex].includes(sessionId))) {
      return res.json({
        success: false,
        error: 'You have already voted for this event.'
      });
    }
    
    // Record the vote
    userVotes[eventIndex].push(userId);
    
    // Update vote count
    let votes = game.votes || [];
    if (votes.length < game.events.length) {
      votes = new Array(game.events.length).fill(0);
    }
    votes[eventIndex] = userVotes[eventIndex].length;
    
    // Determine required votes based on the threshold percentage
    const totalPlayers = (game.players || []).length;
    const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);

    // Get existing verified events
    let verifiedEvents = game.verifiedEvents || [];
    
    // If vote count meets the threshold, mark as verified
    if (votes[eventIndex] >= requiredVotes && !verifiedEvents.includes(eventIndex)) {
      verifiedEvents.push(eventIndex);
    }

    console.log(`Vote count: ${votes[eventIndex]}/${requiredVotes}, verified: ${verifiedEvents.includes(eventIndex)}`);

    // Update the document with optimistic concurrency control
    try {
      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        { 
          votes, 
          verifiedEvents, 
          userVotes: JSON.stringify(userVotes)
        }
      );

      console.log("Updated game document:", updatedGame);
      return res.json({ 
        success: true, 
        game: updatedGame,
        voteCount: votes[eventIndex],
        requiredVotes,
        verified: verifiedEvents.includes(eventIndex)
      });
    } catch (updateError) {
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
