'use client';

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { account, createGame, getOrCreateAnonymousSession, functions } from '@/lib/appwrite';

const FUNCTION_IDS = {
  CREATE_GAME: '67b74156001710462423',
  JOIN_GAME: '67b713e9000667794adc'
};

export default function CreateGame() {
  const [boardSize, setBoardSize] = useState(3);
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' for game creation, 'username' for host joining
  const [createdGame, setCreatedGame] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        setUserId(session.id);
      } catch (error) {
        console.error('Error initializing session:', error);
      }
    };
    initSession();
  }, []);

  const maxEvents = boardSize * boardSize;

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (events.length < maxEvents) {
      setEvents([...events, '']);
    }
  };

  const handleBoardSizeChange = (newSize) => {
    setBoardSize(newSize);
    const newMaxEvents = newSize * newSize;
    if (events.length > newMaxEvents) {
      setEvents(events.slice(0, newMaxEvents));
    }
  };

  const handleEventChange = (index, value) => {
    const newEvents = [...events];
    newEvents[index] = value;
    setEvents(newEvents);
  };

  // Step 1: Create the game document with extra fields (players, votes, verifiedEvents)
  const handleCreateGame = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId) {
      setError('Session not initialized. Please try again.');
      return;
    }

    if (events.length === 0) {
      setError('Please add at least one event.');
      return;
    }

    if (events.some(event => !event.trim())) {
      setError('All events must have content.');
      return;
    }

    // Generate a unique game code (as before)
    const gameData = `${userId}-${boardSize}-${events.join('')}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(gameData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const gameCode = parseInt(hashHex.slice(0, 8), 16) % 10000;
    const formattedGameCode = gameCode.toString().padStart(4, '0');

    try {
      // Create game document. Note that we include extra fields:
      // players: [] (empty at first)
      // votes: an array of zeros (one for each event)
      // verifiedEvents: [] (none verified yet)
      const payload = {
        creatorId: userId,
        boardSize: boardSize,
        events: events,
        votingThreshold: parseInt(document.getElementById('threshold').value, 10) || 50,
        gameCode: formattedGameCode
      };

      const response = await functions.createExecution(
        FUNCTION_IDS.CREATE_GAME,
        JSON.stringify(payload)
      );

      console.log('Create game response:', response);

      if (!response) {
        throw new Error('Invalid response from server');
      }

      const result = JSON.parse(response.responseBody);
      console.log('Create game result:', result);
      
      if (result.success === false) {
        throw new Error(result.error || 'Failed to create game. success is false');
      }

      if (!result.game || !result.game.$id) {
        throw new Error('Invalid game data received');
      }

      setCreatedGame(result.game);
      // move to the next step: ask for host username
      setStep('username');
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to create game. Please try again.');
    }
  };

  // Step 2: Host enters username and we call the cloud function to add them to the game's players array
  const handleJoinAsHost = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate username
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a valid username.');
      return;
    }

    // Validate game and user
    if (!createdGame || !createdGame.$id) {
      setError('Game not found. Please try again.');
      return;
    }
    if (!userId) {
      setError('Session not initialized. Please try again.');
      return;
    }

    try {
      const joinPayload = {
        gameId: createdGame.$id,
        userId: userId,
        username: trimmedUsername
      };

      console.log('Join game payload:', joinPayload);

      const response = await functions.createExecution(
        FUNCTION_IDS.JOIN_GAME,
        JSON.stringify(joinPayload)
      );

      console.log('Join game response:', response);

      if (!response) {
        console.error('Invalid response from server:', response);
        throw new Error('Invalid response from server');
      }

      const result = JSON.parse(response.responseBody);
      console.log('Join game result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to join game');
      }

      if (result.message === 'Player already joined.') {
        console.log('Player already joined, proceeding to game page');
      }

      // After successful join, redirect to game page
      window.location.href = `/game/${createdGame.$id}`;
    } catch (error) {
      console.error('Error joining game as host:', error);
      setError(error.message || 'Failed to join game as host. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tighter mb-6 text-primary">Create Game</h1>
      <div className="w-full max-w-2xl space-y-8">
        {step === 'form' ? (
          <form className="space-y-6" onSubmit={handleCreateGame}>
            {/* Board Size Selection */}
            <div className="space-y-2">
              <label htmlFor="boardSize" className="block text-lg font-medium text-foreground">
                Board Size
              </label>
              <select
                id="boardSize"
                name="boardSize"
                value={boardSize}
                onChange={(e) => handleBoardSizeChange(Number(e.target.value))}
                className={cn(
                  "w-full px-4 py-2 rounded-md",
                  "bg-background border-2 border-secondary",
                  "text-foreground focus:border-primary",
                  "outline-none transition-colors"
                )}
              >
                <option value="3">3 x 3</option>
                <option value="4">4 x 4</option>
                <option value="5">5 x 5</option>
              </select>
            </div>

            {/* Voting Threshold */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="threshold" className="block text-lg font-medium text-foreground">
                  Voting Threshold (%)
                </label>
                <div className="relative group">
                  <div className="cursor-help text-muted-foreground">ⓘ</div>
                  <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-popover text-popover-foreground text-sm rounded-md shadow-lg z-50">
                    The percentage of players that need to vote for an event before it's marked as completed on the bingo board.
                  </div>
                </div>
              </div>
              <input
                type="number"
                id="threshold"
                name="threshold"
                min="1"
                max="100"
                defaultValue="50"
                className={cn(
                  "w-full px-4 py-2 rounded-md",
                  "bg-background border-2 border-secondary",
                  "text-foreground focus:border-primary",
                  "outline-none transition-colors"
                )}
              />
            </div>

            {/* Bingo Events */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-lg font-medium text-foreground">
                  Bingo Events ({events.length}/{maxEvents})
                </label>
                <button
                  onClick={handleAddEvent}
                  disabled={events.length >= maxEvents}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium",
                    "bg-secondary text-secondary-foreground",
                    "hover:bg-secondary/80 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  Add Event
                </button>
              </div>
              <div className="space-y-4">
                {events.map((event, index) => (
                  <input
                    key={index}
                    type="text"
                    value={event}
                    onChange={(e) => handleEventChange(index, e.target.value)}
                    placeholder={`Event ${index + 1}`}
                    className={cn(
                      "w-full px-4 py-2 rounded-md",
                      "bg-background border-2 border-secondary",
                      "text-foreground focus:border-primary",
                      "outline-none transition-colors"
                    )}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-red-500">{error}</p>}
            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              disabled={events.length === 0 || events.some(event => !event.trim()) || !userId}
            >
              Create Game
            </button>
          </form>
        ) : (
          // Step 2: Ask host for a username before joining the game
          <form className="space-y-6" onSubmit={handleJoinAsHost}>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-lg font-medium text-foreground">
                Enter your username (Host)
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                className={cn(
                  "w-full px-4 py-2 rounded-md",
                  "bg-background border-2 border-secondary",
                  "text-foreground focus:border-primary",
                  "outline-none transition-colors"
                )}
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              disabled={!username.trim() || !userId}
            >
              Join as Host
            </button>
          </form>
        )}
      </div>
    </div>
  );
}