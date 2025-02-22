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
    console.log("Parseddd payload:", payload);

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
    console.log("Dumping player");
    console.log(JSON.parse(game.players[0]));
    // Validate the player is in the game
    if (!game.players?.some(player => JSON.parse(player.userId) === userId)) {
      return res.json({
        success: false,
        error: 'User isa idan not a participant in this game.'
      });
    }

    // Validate eventIndex is within bounds
    if (eventIndex >= game.events?.length) {
      return res.json({
        success: false,
        error: 'Invalid event index.'
      });
    }

    console.log("Fetched game data:", game);

    let votes = game.votes || [];
    let verifiedEvents = game.verifiedEvents || [];

    // Initialize votes array if needed
    if (votes.length < game.events.length) {
      votes = new Array(game.events.length).fill(0);
    }

    votes[eventIndex] = (votes[eventIndex] || 0) + 1;

    // Determine required votes based on the threshold percentage
    const totalPlayers = (game.players || []).length;
    const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);

    // If vote count meets the threshold, mark as verified
    if (votes[eventIndex] >= requiredVotes && !verifiedEvents.includes(eventIndex)) {
      verifiedEvents.push(eventIndex);
    }

    // Update the document with optimistic concurrency control
    try {
      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        { votes, verifiedEvents }
      );

      console.log("Updated game document:", updatedGame);
      return res.json({ success: true, game: updatedGame });
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
