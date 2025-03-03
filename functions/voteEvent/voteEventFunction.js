import { Client, Users, Databases } from 'node-appwrite';

export default async ({ req, res, context }) => {
  // Switch to using context.log for better logging experience
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);
  try {
    context.log("Received request:", req);

    // Extract payload safely from the nested request structure
    const payload = req.bodyJson || JSON.parse(req.body || '{}');
    context.log("Parsed payload:", payload);

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
    
    // Validate the player is in the game - Fix the player validation
    let isUserInGame = false;
    if (game.players && Array.isArray(game.players)) {
      for (const player of game.players) {
        try {
          const playerData = typeof player === 'string' ? JSON.parse(player) : player;
          if (playerData.userId === userId) {
            isUserInGame = true;
            break;
          }
        } catch (parseError) {
          context.error("Error parsing player data:", parseError);
        }
      }
    }
    
    if (!isUserInGame) {
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

    context.log("Game data validated successfully");

    // Initialize votes and verifiedEvents if they don't exist
    let votes = Array.isArray(game.votes) ? [...game.votes] : [];
    let verifiedEvents = Array.isArray(game.verifiedEvents) ? [...game.verifiedEvents] : [];
    
    // Initialize userVotes if it doesn't exist or parse it if it's a string
    let userVotes = {};
    if (game.userVotes) {
      try {
        userVotes = typeof game.userVotes === 'string' 
          ? JSON.parse(game.userVotes) 
          : game.userVotes;
      } catch (e) {
        context.error("Error parsing userVotes:", e);
        userVotes = {};
      }
    }
    
    // Make sure votes array is initialized with the right length
    if (votes.length < game.events.length) {
      votes = Array(game.events.length).fill(0);
    }
    
    // Check if user has already voted for this event
    if (userVotes[eventIndex] && userVotes[eventIndex].includes(userId)) {
      return res.json({
        success: false,
        error: 'User has already voted for this event.'
      });
    }
    
    // Add user to votes for this event
    if (!userVotes[eventIndex]) {
      userVotes[eventIndex] = [];
    }
    userVotes[eventIndex].push(userId);
    
    // Update the vote count
    votes[eventIndex] = userVotes[eventIndex].length;

    // Determine required votes based on the threshold percentage
    const totalPlayers = (game.players || []).length;
    const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);

    // If vote count meets the threshold, mark as verified
    if (votes[eventIndex] >= requiredVotes && !verifiedEvents.includes(eventIndex)) {
      verifiedEvents.push(eventIndex);
    }
    
    context.log(`Vote registered: Event ${eventIndex}, Vote count: ${votes[eventIndex]}/${requiredVotes}`);

    // Update the document
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

      context.log("Updated game document successfully");
      return res.json({ 
        success: true, 
        game: updatedGame,
        votesForEvent: votes[eventIndex],
        requiredVotes,
        isVerified: verifiedEvents.includes(eventIndex)
      });
    } catch (updateError) {
      context.error("Error updating document:", updateError);
      if (updateError.code === 409) {
        return res.json({
          success: false,
          error: 'Game was modified by another player. Please try again.'
        });
      }
      throw updateError;
    }

  } catch (error) {
    context.error("Error in voteEventFunction:", error);
    return res.json({
      success: false,
      error: error.message || "Unknown error occurred"
    });
  }
};
