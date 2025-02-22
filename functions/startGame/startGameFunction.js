import { Client, Databases } from 'node-appwrite';

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new Databases(client);

export default async ({ req, res }) => {
  try {
    // Extract payload and user ID from headers
    const payload = req?.bodyJson || JSON.parse(req?.body || '{}');
    console.log('Received payload:', payload);

    const userId = req.headers['x-appwrite-user-id'];
    const { gameId } = payload;

    if (!gameId) {
      return res.json({
        success: false,
        error: 'Missing required parameter: gameId'
      });
    }

    if (!userId) {
      return res.json({
        success: false,
        error: 'User ID not found in request headers'
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
        error: 'Game not found'
      });
    }

    // Verify the user is the host
    if (game.host !== userId) {
      return res.json({
        success: false,
        error: 'Only the host can start the game'
      });
    }

    if (game.status !== 'waiting') {
      return res.json({
        success: false,
        error: 'Game cannot be started from its current state'
      });
    }

    // Update game status to started
    const updatedGame = await database.updateDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId,
      { status: 'started' }
    );

    return res.json({
      success: true,
      game: updatedGame
    });

  } catch (error) {
    console.error('Error in startGameFunction:', error);
    return res.json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
};