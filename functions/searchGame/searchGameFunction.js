const { Client, Databases, Query } = require('node-appwrite');

module.exports = async function(req, res) {
  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);
  const BINGO_DATABASE_ID = process.env.BINGO_DATABASE_ID;
  const GAMES_COLLECTION_ID = process.env.GAMES_COLLECTION_ID;

  try {
    const { gameCode } = JSON.parse(req.payload);

    if (!gameCode) {
      throw new Error('Game code is required');
    }

    const games = await database.listDocuments(
      BINGO_DATABASE_ID,
      GAMES_COLLECTION_ID,
      [Query.equal('gameCode', gameCode)]
    );

    if (games.total === 0) {
      return res.json({
        success: false,
        message: 'Game not found'
      });
    }

    return res.json({
      success: true,
      game: games.documents[0]
    });
  } catch (error) {
    console.error('Error searching game:', error);
    return res.json({
      success: false,
      message: error.message || 'Failed to search game'
    });
  }
};