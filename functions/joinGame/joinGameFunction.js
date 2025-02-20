const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) 
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Databases(client);

module.exports = async function (req, res) {
  try {
    console.log("Received request:", req); 

    // Extract payload safely
    const payload = req.bodyJson || JSON.parse(req.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameId, userId, username } = payload;
    if (!gameId || !userId || !username) {
      return res.json({ error: 'Missing parameters: gameId, userId, username are required.' });
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    console.log("Fetched game data:", game);
    
    let players = game.players || [];

    // Check if the player is already in the game
    if (players.some(player => player.userId === userId)) {
      return res.json({ success: true, message: 'Player already joined.' });
    }

    // Add the player
    players.push({
      userId,
      username,
      ticked: []  // Initially, no events ticked
    });

    // Update the document
    const updatedGame = await database.updateDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId,
      { players }
    );

    console.log("Updated game document:", updatedGame);
    return res.json({ success: true, game: updatedGame });

  } catch (error) {
    console.error("Error in joinGameFunction:", error);
    return res.json({ error: error.message || "Unknown error occurred" });
  }
};
