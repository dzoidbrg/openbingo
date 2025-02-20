const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) // e.g. 'https://cloud.appwrite.io/v1'
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Database(client);

module.exports = async function (req, res) {
  try {
    const payload = JSON.parse(req.payload || '{}');
    const { gameId, userId, username } = payload;
    if (!gameId || !userId || !username) {
      return res.json({ success: false, message: 'Missing parameters: gameId, userId, and username are required.' });
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    let players = game.players || [];

    // Check if the player is already in the game
    if (players.some(player => player.userId === userId)) {
      return res.json({ success: true, message: 'Player already joined.', game });
    }

    // Create the new player object
    const newPlayer = {
      userId,
      username,
      ticked: []  // initially no events ticked
    };

    players.push(newPlayer);

    // Update read permissions: add the joining user's id if not already present.
    let currentRead = game.$read || [];
    const joinPerm = `user:${userId}`;
    if (!currentRead.includes(joinPerm)) {
      currentRead.push(joinPerm);
    }

    // Update the document with new players and updated read permissions.
    const updatedGame = await database.updateDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId,
      { players },
      currentRead, // new read permissions
      game.$write // keep existing write permissions
    );

    return res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error in joinGameFunction:', error);
    return res.json({ success: false, message: error.message });
  }
};
