import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '67b4bca9001e13fd56e8');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

// Database constants
export const BINGO_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '67b5bce200233eec2c46';
export const GAMES_COLLECTION_ID = '67b5bd0d001f0c97796f';
export const PLAYERS_COLLECTION_ID = '67b5bd050023f4aa24fb';

// Helper functions for common Appwrite operations
export const createGame = async (gameData) => {
    try {
        const response = await databases.createDocument(
            BINGO_DATABASE_ID,
            GAMES_COLLECTION_ID,
            'unique()',
            gameData
        );
        return response;
    } catch (error) {
        console.error('Error creating game:', error);
        throw error;
    }
};

export const joinGame = async (gameId, playerData) => {
    try {
        const response = await databases.createDocument(
            BINGO_DATABASE_ID,
            PLAYERS_COLLECTION_ID,
            'unique()',
            {
                gameId,
                ...playerData,
                joinedAt: new Date().toISOString()
            }
        );
        return response;
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

// Helper function to get or create anonymous session
export const getOrCreateAnonymousSession = async () => {
    try {
        // Try to get current session first
        const currentSession = await account.getSession('current');
        return currentSession;
    } catch (error) {
        // If no session exists, create a new anonymous session
        try {
            const newSession = await account.createAnonymousSession();
            return newSession;
        } catch (error) {
            console.error('Error creating anonymous session:', error);
            throw error;
        }
    }
};