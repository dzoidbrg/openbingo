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

    const { creatorId, boardSize, events, votingThreshold } = payload;
    if (!creatorId || !boardSize || !events || !votingThreshold) {
      return response.json({
        success: false,
        error: "Missing required fields: creatorId, boardSize, events, votingThreshold."
      });
    }

    // Generate a random 4-character game code if not provided
    const gameCode = payload.gameCode || Math.random().toString(36).substring(2, 6).toUpperCase();

    // Create the game document
    const game = await database.createDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      sdk.ID.unique(),
      {
        creatorId,
        boardSize,
        events,
        status: "waiting",
        gameCode,
        votingThreshold,
        players: [], // Initially empty
        votes: new Array(events.length).fill(0), // Initialize votes array
        verifiedEvents: [] // Empty at start
      }
    );

    console.log("Created game document:", game);
    return response.json({ success: true, game });

  } catch (error) {
    console.error("Error in createGameFunction:", error);
    return response.json({
      success: false,
      error: error.message || "An unexpected error occurred while creating the game"
    });
  }
};
