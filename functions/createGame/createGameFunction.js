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

    const { creatorId, boardSize, events, gameCode, votingThreshold } = payload;
    if (!creatorId || !boardSize || !events || !gameCode || !votingThreshold) {
      return res.json({ error: "Missing required fields: creatorId, boardSize, events, gameCode, votingThreshold." });
    }

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
    return res.json({ success: true, game });

  } catch (error) {
    console.error("Error in createGameFunction:", error);
    return res.json({ error: error.message || "Unknown error occurred" });
  }
};
