import { Client, Account, Databases, Storage, Functions } from 'appwrite';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

// Database constants
export const BINGO_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
export const GAMES_COLLECTION_ID = process.env.APPWRITE_COLLECTION_GAMES_ID;
export const PLAYERS_COLLECTION_ID = process.env.APPWRITE_COLLECTION_PLAYERS_ID;

export const subscribeRealtime = (channel, callback) => {
  return client.subscribe(channel, callback);
};

export const setRealtimeEndpoint = (endpoint) => {
  client.setEndpointRealtime(endpoint);
};

export const createGame = async (gameData) => {
  try {
    const payload = JSON.stringify({
      creatorId: gameData.creatorId,
      events: gameData.events,
      boardSize: gameData.boardSize,
      votingThreshold: gameData.votingThreshold
    });
    const result = await functions.createExecution(process.env.APPWRITE_FUNCTION_CREATE_GAME_ID, payload);
    const response = JSON.parse(result.response);
    if (!response.success) {
      throw new Error(response.message || 'Failed to create game');
    }
    return response.game;
  } catch (error) {
    console.error('Error creating game:', error);
    throw error;
  }
};

export const joinGame = async (gameId, playerData) => {
  try {
    const payload = JSON.stringify({
      gameId,
      userId: playerData.userId,
      username: playerData.username
    });
    const result = await functions.createExecution(process.env.APPWRITE_FUNCTION_JOIN_GAME_ID, payload);
    const response = JSON.parse(result.response);
    if (!response.success) {
      throw new Error(response.message || 'Failed to join game');
    }
    return response.game;
  } catch (error) {
    console.error('Error joining game:', error);
    throw error;
  }
};

export const getGame = async (gameId) => {
  try {
    const response = await databases.getDocument(
      BINGO_DATABASE_ID,
      GAMES_COLLECTION_ID,
      gameId
    );
    return response;
  } catch (error) {
    console.error('Error fetching game:', error);
    throw error;
  }
};

export const updateGameState = async (gameId, updateData) => {
  try {
    const response = await databases.updateDocument(
      BINGO_DATABASE_ID,
      GAMES_COLLECTION_ID,
      gameId,
      updateData
    );
    return response;
  } catch (error) {
    console.error('Error updating game state:', error);
    throw error;
  }
};

export const getGamePlayers = async (gameId) => {
  try {
    const response = await databases.listDocuments(
      BINGO_DATABASE_ID,
      PLAYERS_COLLECTION_ID,
      [
        databases.queries.equal('gameId', gameId)
      ]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching game players:', error);
    throw error;
  }
};

// Add a cache for the current session to prevent excessive API calls
let cachedSession = null;
let sessionPromise = null;

export const getOrCreateAnonymousSession = async () => {
  // Return cached session if it exists
  if (cachedSession) {
    return cachedSession;
  }
  
  // If a request is already in progress, wait for it
  if (sessionPromise) {
    return sessionPromise;
  }
  
  // Create a new promise for the session request
  sessionPromise = (async () => {
    try {
      // Try to get the current session
      const session = await account.getSession('current');
      cachedSession = session;
      return session;
    } catch (error) {
      // If there's no current session, create an anonymous one
      try {
        const newSession = await account.createAnonymousSession();
        cachedSession = newSession;
        return newSession;
      } catch (createError) {
        console.error('Failed to create anonymous session:', createError);
        throw createError;
      }
    } finally {
      // Clear the promise so future calls will make a new request if needed
      sessionPromise = null;
    }
  })();
  
  return sessionPromise;
};

// Optional: Function to explicitly clear the session cache if needed
export const clearSessionCache = () => {
  cachedSession = null;
};
