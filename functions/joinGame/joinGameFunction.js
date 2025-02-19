// joinGameFunction.js
const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) // e.g. 'https://[HOSTNAME_OR_IP]/v1'
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Database(client);

module.exports = async function (req, res) {
  try {
    // Parse the JSON payload
    const payload = JSON.parse(req.payload || '{}');
    const { gameId, userId, username } = payload;
    if (!gameId || !userId || !username) {
      res.json({ error: 'Missing parameters: gameId, userId, username are required.' });
      return;
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    // Ensure players array exists
    let players = game.players || [];

    // Check if the player is already in the game
    if (players.some(player => player.userId === userId)) {
      res.json({ success: true, message: 'Player already joined.' });
      return;
    }

    // Create the new player object
    const newPlayer = {
      userId,
      username,
      ticked: []  // initially no events ticked
    };

    players.push(newPlayer);

    // Update the document (only the players array)
    const updatedGame = await database.updateDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId,
      { players }
    );

    res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error in joinGameFunction:', error);
    res.json({ error: error.message });
  }
};
