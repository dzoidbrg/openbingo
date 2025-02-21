import { Client, Databases, Query } from 'node-appwrite';


export default async ({ req, res, log, error }) => {

  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT) 
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const database = new Databases(client);

    try {
    console.log("Received request:", req);

    const payload = req.req?.bodyJson || JSON.parse(req.req?.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameCode } = payload;
    console.log(gameCode)
    if (!gameCode || String(gameCode).length !== 4) {
      return res.json({
        success: false,
        error: "Missing or invalid gameCode. Must be 4 characters long."
      });
    }

    const result = await database.listDocuments(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      [
        Query.equal("gameCode", [gameCode.toUpperCase()]),
        Query.limit(1)
      ]
    );

    if (!result || result.total === 0) {
      return res.text('No games found with the specified code', 404);
    }

    const game = result.documents[0];
    console.log("Found game document:", game);
    
    return res.text('Game found', 200);



  } catch (error) {
    console.error("Error in searchGameFunction:", error);
    return res.text('An unexpected error occured while searching for the game.', 500);
  }
};