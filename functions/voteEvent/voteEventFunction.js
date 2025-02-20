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

    const { gameId, eventIndex, userId } = payload;
    if (!gameId || eventIndex === undefined || !userId) {
      return res.json({ error: 'Missing parameters: gameId, eventIndex, and userId are required.' });
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    console.log("Fetched game data:", game);

    let votes = game.votes || [];
    let verifiedEvents = game.verifiedEvents || [];

    votes[eventIndex] = (votes[eventIndex] || 0) + 1;

    // Determine required votes based on the threshold percentage
    const totalPlayers = (game.players || []).length;
    const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);

    // If vote count meets the threshold, mark as verified
    if (votes[eventIndex] >= requiredVotes && !verifiedEvents.includes(eventIndex)) {
      verifiedEvents.push(eventIndex);
    }

    // Update the document
    const updatedGame = await database.updateDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId,
      { votes, verifiedEvents }
    );

    console.log("Updated game document:", updatedGame);
    return res.json({ success: true, game: updatedGame });

  } catch (error) {
    console.error("Error in voteEventFunction:", error);
    return res.json({ error: error.message || "Unknown error occurred" });
  }
};
