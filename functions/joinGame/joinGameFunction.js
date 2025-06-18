import { Client, Databases, Permission, Role } from 'node-appwrite';
import { createHash } from 'node:crypto';

export default async ({ req, res, log, error }) => {
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const database = new Databases(client);

  try {
    console.log("Received request:", req);

    const payload = req?.bodyJson || JSON.parse(req?.body || '{}');
    console.log("Parsed payload:", payload);

    const { gameId, userId, username, ...extraFields } = payload;
    
    // Check for any unauthorized fields
    if (Object.keys(extraFields).length > 0) {
      return res.json({
        success: false,
        error: 'Invalid request: Only gameId, userId, and username are allowed.'
      });
    }

    // Validate required fields and username length
    if (!gameId || !userId || !username || typeof username !== 'string') {
      return res.json({
        success: false,
        error: 'Missing or invalid parameters. gameId, userId, and username (string) are required.'
      });
    }

    // Check username length
    if (username.length > 20) {
      return res.json({
        success: false,
        error: 'Username must not exceed 20 characters.'
      });
    }

    // Get the game document
    const game = await database.getDocument(
      process.env.BINGO_DATABASE_ID,
      process.env.GAMES_COLLECTION_ID,
      gameId
    );

    if (!game) {
      return res.json({
        success: false,
        error: 'Game not found.'
      });
    }

    console.log("Fetched game data:", game);

    // Assume players is an array of JSON strings
    let players = game.players || [];

    // Parse existing players to check for duplicates
    const parsedPlayers = players.map(playerString => {
      try {
        return JSON.parse(playerString);
      } catch (e) {
        // In case it's already an object or malformed, return as-is.
        return playerString;
      }
    });

    if (parsedPlayers.some(player => player && player.userId === userId)) {
      return res.json({ success: true, message: 'Player already joined.' });
    }

    if (parsedPlayers.some(player => player && player.username.trim().toLowerCase() === username.trim().toLowerCase())) {
      return res.json({ success: false, error: 'Username already taken. Please choose another.' });
    }

    // check for the game status being 'waiting', if its not then return an error
    if (game.status !== 'waiting') {
      return res.json({
        success: false,
        error: 'Game has already started or ended!'
      });
    }

    // Create a new player board based on events in the game
    const gameDimensions = Math.ceil(Math.sqrt(game.events.length));
    const shuffledGame = [...game].sort(() => Math.random() - 0.5);
    const totalCells = gameDimensions * gameDimensions;
    const uniqueElements = shuffledGame.slice(0, totalCells);
    
    let newPlayerBoard;
    // check for free space
    if (game.addFreeSpace) {
      const newPlayerBoard = Array.from({ length: gameDimensions }, (_, row) => {
        const rowElements = uniqueElements.slice(row * gameDimensions, (row + 1) * gameDimensions);
        if (row === Math.floor(gameDimensions / 2)) {
          const midIndex = Math.floor(gameDimensions / 2);
          rowElements[midIndex] = game.freeSpaceText;
        }
        return rowElements;
      });
    } else {
    const newPlayerBoard = Array.from({ length: gameDimensions }, (_, row) =>
      uniqueElements.slice(row * gameDimensions, (row + 1) * gameDimensions)
    );
    }

    // Create new player object and stringify it for storage
    const newPlayerObj = {
      userId,
      username: username.trim(),
      ticked: [],
      playerBoard: newPlayerBoard,
      boardHash: createHash('sha256').update(JSON.stringify(newPlayerBoard)).digest('hex'),
    };
    const newPlayerString = JSON.stringify(newPlayerObj);
    players.push(newPlayerString);



    try {

      const updatedGame = await database.updateDocument(
        process.env.BINGO_DATABASE_ID,
        process.env.GAMES_COLLECTION_ID,
        gameId,
        {
          players
        },
        [...game.$permissions, Permission.read(Role.user(userId))]
      );

      console.log("Updated game document:", updatedGame);
      return res.json({ success: true, game: updatedGame });
    } catch (updateError) {
      if (updateError.code === 409) {
        return res.json({
          success: false,
          error: 'Game was modified by another player. Please try again.'
        });
      }
      throw updateError;
    }

  } catch (err) {
    console.error("Error in joinGameFunction:", err);
    return res.json({
      success: false,
      error: err.message || "Unknown error occurred"
    });
  }
};
