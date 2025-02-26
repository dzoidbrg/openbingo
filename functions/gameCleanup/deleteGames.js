import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);

  try {
    console.log("Starting game cleanup process");

    // Calculate the timestamp for 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // List all documents
    const games = await database.listDocuments(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      [
        Query.lessThan('$createdAt', twentyFourHoursAgo.toISOString())
      ]
    );

    console.log(`Found ${games.documents.length} games older than 24 hours`);

    const deletionResults = [];
    for (const game of games.documents) {
      try {
        await database.deleteDocument(
          process.env.BINGO_DATABASE_ID,
          process.env.GAMES_COLLECTION_ID,
          game.$id
        );
        deletionResults.push({
          gameId: game.$id,
          status: 'deleted',
          createdAt: game.$createdAt
        });
      } catch (deleteError) {
        console.error(`Failed to delete game ${game.$id}:`, deleteError);
        deletionResults.push({
          gameId: game.$id,
          status: 'error',
          error: deleteError.message
        });
      }
    }

    return res.json({
      success: true,
      message: `Cleanup complete. Processed ${deletionResults.length} games.`,
      details: deletionResults
    });

  } catch (err) {
    console.error("Error in deleteGames function:", err);
    return res.json({
      success: false,
      error: err.message || "Unknown error occurred"
    });
  }
};
