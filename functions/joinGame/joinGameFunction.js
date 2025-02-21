const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) 
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Databases(client);

module.exports = async function (req, res) {
  const response = {
    json: (data) => data
  };

  try {
    console.log("Received request:", req); 

    // Extract payload safely from the nested request structure
    const payload = req.req?.bodyJson || JSON.parse(req.req?.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameId, userId, username } = payload;
    if (!gameId || !userId || !username || typeof username !== 'string') {
      return response.json({
        success: false,
        error: 'Missing or invalid parameters. gameId, userId, and username (string) are required.'
      });
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    if (!game) {
      return response.json({
        success: false,
        error: 'Game not found.'
      });
    }

    console.log("Fetched game data:", game);
    
    let players = game.players || [];

    // Check if the player is already in the game
    if (players.some(player => player.userId === userId)) {
      return response.json({ success: true, message: 'Player already joined.' });
    }

    // Add the player with sanitized username
    players.push({
      userId,
      username: username.trim(),
      ticked: []  // Initially, no events ticked
    });

    // Update the document with optimistic concurrency control
    try {
      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        { players }
      );

      console.log("Updated game document:", updatedGame);
      return response.json({ success: true, game: updatedGame });
    } catch (updateError) {
      if (updateError.code === 409) {
        return response.json({
          success: false,
          error: 'Game was modified by another player. Please try again.'
        });
      }
      throw updateError;
    }

  } catch (error) {
    console.error("Error in joinGameFunction:", error);
    return response.json({
      success: false,
      error: error.message || "Unknown error occurred"
    });
  }
};
