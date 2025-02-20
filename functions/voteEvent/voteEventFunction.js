const sdk = require('node-appwrite');

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Database(client);

module.exports = async function (req, res) {
  try {
    const payload = JSON.parse(req.payload || '{}');
    const { gameId, eventIndex, userId } = payload;
    if (!gameId || eventIndex === undefined || !userId) {
      return res.json({ success: false, message: 'Missing parameters: gameId, eventIndex, and userId are required.' });
    }

    // Fetch the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    // Ensure votes is an array and verifiedEvents is an array
    let votes = game.votes || [];
    let verifiedEvents = game.verifiedEvents || [];

    // Initialize vote count for this event if necessary and increment it
    votes[eventIndex] = votes[eventIndex] || 0;
    votes[eventIndex]++;

    // Determine required votes based on the number of players and voting threshold
    const totalPlayers = (game.players || []).length;
    const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);

    // If the vote count meets the threshold and the event isn’t already verified, mark it as verified.
    if (votes[eventIndex] >= requiredVotes && !verifiedEvents.includes(eventIndex)) {
      verifiedEvents.push(eventIndex);
    }

    const updatedGame = await database.updateDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId,
      { votes, verifiedEvents },
      game.$read,
      game.$write
    );

    return res.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('Error in voteEventFunction:', error);
    return res.json({ success: false, message: error.message });
  }
};
