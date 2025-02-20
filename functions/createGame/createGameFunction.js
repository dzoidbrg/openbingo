const { Client, Databases, ID } = require('node-appwrite');

module.exports = async function(req, res) {
  const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);
  const BINGO_DATABASE_ID = process.env.BINGO_DATABASE_ID;
  const GAMES_COLLECTION_ID = process.env.GAMES_COLLECTION_ID;

  try {
    const { creatorId, events, boardSize, votingThreshold } = JSON.parse(req.payload);

    if (!creatorId || !events || !boardSize || !votingThreshold) {
      throw new Error('Missing required fields');
    }

    // Generate a random 4-character game code
    const gameCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    // Initialize votes as an array of zeros (one per event)
    const votes = new Array(events.length).fill(0);

    // Set initial read permissions to include the host
    const readPermissions = [`user:${creatorId}`];
    // Optionally, set write permissions (for example, to only allow the host to update)
    const writePermissions = [`user:${creatorId}`];

    const game = await database.createDocument(
      BINGO_DATABASE_ID,
      GAMES_COLLECTION_ID,
      ID.unique(),
      {
        creatorId,
        events,
        boardSize,
        votingThreshold,
        gameCode,
        status: 'waiting',
        players: [],
        votes,
        verifiedEvents: []
      },
      readPermissions,
      writePermissions
    );

    return res.json({
      success: true,
      game
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return res.json({
      success: false,
      message: error.message || 'Failed to create game'
    });
  }
};
