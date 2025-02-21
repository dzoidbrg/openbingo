import { Client, Databases, Permission, Role } from 'node-appwrite';


export default async ({ req, res, log, error }) => {
  const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) 
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);

  try {
    console.log("Received request:", req); 

    const payload = req?.bodyJson || JSON.parse(req?.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameId, userId, username } = payload;
    if (!gameId || !userId || !username || typeof username !== 'string') {
      return res.json({
        success: false,
        error: 'Missing or invalid parameters. gameId, userId, and username (string) are required.'
      });
    }

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

    console.log("Fetched game data:", game);
    
    let players = game.players || [];

    if (players.some(player => player.userId === userId)) {
      return res.json({ success: true, message: 'Player already joined.' });
    }

    players.push({
      userId,
      username: username.trim(),
      ticked: []
    });

    try {
      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        { 
          players,
          $permissions: [
            Permission.read(Role.user(userId))
          ]
        }
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
    console.error("Error in joinGameFunction:", error);
    return res.json({
      success: false,
      error: error.message || "Unknown error occurred"
    });
  }
};
