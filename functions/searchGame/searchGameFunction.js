const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) 
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Databases(client);
const Query = sdk.Query;

module.exports = async function (req, res) {
  try {
    console.log("Received request:", req);

    // Extract payload safely from the nested request structure
    const payload = req.req?.bodyJson || JSON.parse(req.req?.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameCode } = payload;
    if (!gameCode || typeof gameCode !== 'string') {
      return res.json({
        success: false,
        error: "Missing or invalid gameCode. Must be a string."
      });
    }

    // Search for game using gameCode with proper query filter
    const result = await database.listDocuments(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      [
        Query.equal("gameCode", [gameCode.toUpperCase()]),
        Query.limit(1)
      ]
    );

    if (!result || result.total === 0) {
      return res.json({
        success: false,
        error: "Game not found with the provided code."
      });
    }

    const game = result.documents[0];
    console.log("Found game document:", game);
    
    return res.json({
      success: true,
      game: {
        ...game,
        gameCode: game.gameCode
      }
    });

  } catch (error) {
    console.error("Error in searchGameFunction:", error);
    return res.json({
      success: false,
      error: error.message || "An unexpected error occurred while searching for the game"
    });
  }
};
