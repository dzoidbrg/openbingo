// voteEventFunction.js
const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Database(client);

module.exports = async function (req, res) {
  try {
    // Parse the JSON payload
    const payload = JSON.parse(req.payload || '{}');
    const { gameId, eventIndex, userId } = payload;
    if (!gameId || eventIndex === undefined || !userId) {
      res.json({ error: 'Missing parameters: gameId, eventIndex, and userId are required.' });
      return;
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    // Ensure votes and verifiedEvents arrays exist
    let votes = game.votes || [];
    let verifiedEvents = game.verifiedEvents || [];

    // Initialize vote count for this event if necessary
    votes[eventIndex] = votes[eventIndex] || 0;

    // Increment the vote count
    votes[eventIndex]++;

    // Determine required votes based on threshold percentage
    const totalPlayers = (game.players || []).length;
    const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);

    // If the vote count meets or exceeds the threshold and the event is not yet verified, mark it verified.
    if (votes[eventIndex] >= requiredVotes && !verifiedEvents.includes(eventIndex)) {
      verifiedEvents.push(eventIndex);
      // Optionally, you might update each player's ticked field here.
      // For simplicity, we assume clients read from verifiedEvents.
    }

    // Update the game document with new votes and verifiedEvents
    const updatedGame = await database.updateDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId,
      { votes, verifiedEvents }
    );

    res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error in voteEventFunction:', error);
    res.json({ error: error.message });
  }
};
