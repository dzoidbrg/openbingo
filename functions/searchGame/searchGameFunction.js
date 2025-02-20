const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) 
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Databases(client);
const query = sdk.Query;

module.exports = async function (req, res) {
  try {
    console.log("Received request:", req);

    // Extract payload safely from the nested request structure
    const payload = req.req?.bodyJson || JSON.parse(req.req?.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameCode } = payload;
    if (!gameCode) {
      return res.json({ error: "Missing required field: gameCode." });
    }

    // Search for game using gameCode
    const result = await database.listDocuments(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      [query.equal("gameCode", gameCode)]
    );

    if (result.total === 0) {
      return res.json({ error: "Game not found." });
    }

    console.log("Found game document:", result.documents[0]);
    return res.json({ success: true, game: result.documents[0] });

  } catch (error) {
    console.error("Error in searchGameFunction:", error);
    return res.json({ error: error.message || "Unknown error occurred" });
  }
};
