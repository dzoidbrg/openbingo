import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT) 
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);
  try {
    console.log("Received request:", req);

    // Extract payload safely from the nested request structure
    const payload = req.req?.bodyJson || JSON.parse(req.body || '{}');
    console.log("Parsed payload:", payload);

    const { creatorId, boardSize, events, votingThreshold } = payload;
    if (!creatorId || !boardSize || !events || !votingThreshold) {
      return res.json({
        success: false,
        error: "Missing required fields: creatorId, boardSize, events, votingThreshold."
      });
    }

    // Check if randomizeBoards and addFreeSpace are enabled
    const randomizeBoards = payload.randomizeBoards || false;
    const addFreeSpace = payload.addFreeSpace || false;

    // Calculate board capacity accounting for free space
    const totalBoardSpots = boardSize * boardSize;
    const requiredEvents = addFreeSpace ? totalBoardSpots - 1 : totalBoardSpots;

    // Validate event count - must have at least enough to fill the board
    if (!randomizeBoards && events.length < requiredEvents) {
      return res.json({
        success: false,
        error: `Not enough events provided. Needed: ${requiredEvents}, Provided: ${events.length}`
      });
    }

    // Generate a random 4-character game code if not provided
    const gameCode = payload.gameCode || Math.random().toString(36).substring(2, 6).toUpperCase();

    // Create the game document
    const gameData = {
      creatorId,
      boardSize,
      events,
      status: "waiting",
      gameCode,
      votingThreshold,
      players: [], // Initially empty
      votes: new Array(events.length).fill(0), // Initialize votes array
      verifiedEvents: [], // Empty at start
      host: creatorId, // Set the host to the creator
      randomizeBoards, // Store whether boards should be randomized
      addFreeSpace, // Store whether free space is enabled
    };

    // If a free space text is provided in the payload, use it, otherwise default to "FREE SPACE"
    if (addFreeSpace) {
      gameData.freeSpaceText = payload.freeSpaceText || "Free Space";
    }

    const game = await database.createDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      ID.unique(),
      gameData
    );

    console.log("Created game document:", game);
    return res.json({ success: true, game });

  } catch (error) {
    console.error("Error in createGameFunction:", error);
    return res.json({
      success: false,
      error: error.message || "An unexpected error occurred while creating the game"
    });
  }
};