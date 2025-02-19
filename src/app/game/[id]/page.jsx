'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { databases, realtime, BINGO_DATABASE_ID, GAMES_COLLECTION_ID, getOrCreateAnonymousSession, functions } from '@/lib/appwrite';

export default function GamePage({ params }) {
  const [game, setGame] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalEventIndex, setModalEventIndex] = useState(null);

  // Get current user session
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        setUserId(session.$id);
      } catch (err) {
        console.error('Error initializing session:', err);
      }
    };
    initSession();
  }, []);

  // Fetch game document and subscribe to realtime updates
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const gameData = await databases.getDocument(
          BINGO_DATABASE_ID,
          GAMES_COLLECTION_ID,
          params.id
        );
        setGame(gameData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load game');
        console.error('Error fetching game:', err);
        setLoading(false);
      }
    };

    fetchGame();

    // Subscribe to realtime changes for this game document
    const unsubscribe = realtime.subscribe(
      `databases.${BINGO_DATABASE_ID}.collections.${GAMES_COLLECTION_ID}.documents.${params.id}`,
      (response) => {
        if(response.payload) {
          setGame(response.payload);
        }
      }
    );

    return () => unsubscribe();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">{error || 'Game not found'}</div>
      </div>
    );
  }

  // Determine if the current user is the host (creator)
  const isHost = game.creatorId === userId;

  // Handle starting the game (only host)
  const handleStartGame = async () => {
    try {
      // Update the game document status to "started"
      await databases.updateDocument(
        BINGO_DATABASE_ID,
        GAMES_COLLECTION_ID,
        game.$id,
        { status: 'started' }
      );
    } catch (err) {
      console.error('Error starting game:', err);
    }
  };

  // Call the voteEvent cloud function for a given event index.
  const handleVote = async (eventIndex) => {
    try {
      const payload = JSON.stringify({
        gameId: game.$id,
        eventIndex,
        userId
      });
      await functions.createExecution('voteEvent', payload);
    } catch (err) {
      console.error('Error voting for event:', err);
    }
  };

  // When a cell is clicked, show a modal with the list of players who have that event ticked.
  const handleShowModal = (eventIndex) => {
    setModalEventIndex(eventIndex);
  };

  const closeModal = () => {
    setModalEventIndex(null);
  };

  // Basic grid CSS class based on boardSize
  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  }[game.boardSize] || 'grid-cols-3';

  // Determine which players have this event ticked (based on their "ticked" array)
  const getPlayersForEvent = (eventIndex) => {
    return (game.players || []).filter(player =>
      player.ticked && player.ticked.includes(eventIndex)
    );
  };

  return (
    <div className="min-h-screen p-4">
      {game.status === 'waiting' && (
        <div className="mb-4 p-4 border border-dashed border-secondary rounded-md">
          <h2 className="text-2xl font-bold mb-2">Waiting Room</h2>
          <p className="mb-2">Players joined:</p>
          <ul className="mb-4">
            {(game.players || []).map((player, idx) => (
              <li key={idx}>{player.username}</li>
            ))}
          </ul>
          {isHost && (
            <button
              onClick={handleStartGame}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              Start Game
            </button>
          )}
        </div>
      )}

      {game.status === 'started' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Personal Bingo Board */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Your Bingo Board</h2>
            <div className={cn('grid gap-4', gridCols)}>
              {game.events.map((event, index) => (
                <div
                  key={index}
                  onClick={() => handleShowModal(index)}
                  className={cn(
                    'aspect-square p-4 flex items-center justify-center text-center cursor-pointer rounded-lg',
                    game.verifiedEvents && game.verifiedEvents.includes(index)
                      ? 'bg-green-300'
                      : 'bg-background border-2 border-primary hover:bg-primary/5 transition-colors'
                  )}
                >
                  <p className="text-sm">{event}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Communal Voting Board */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Communal Board</h2>
            <div className="space-y-4">
              {game.events.map((event, index) => {
                const voteCount = (game.votes && game.votes[index]) || 0;
                // Calculate required votes (as percentage of players)
                const totalPlayers = (game.players || []).length;
                const requiredVotes = Math.ceil(totalPlayers * game.votingThreshold / 100);
                const verified = game.verifiedEvents && game.verifiedEvents.includes(index);
                return (
                  <div key={index} className="flex items-center justify-between border p-2 rounded">
                    <div>
                      <p className="font-medium">{event}</p>
                      <p className="text-xs text-muted-foreground">
                        {verified ? 'Verified' : `${voteCount} / ${requiredVotes} votes`}
                      </p>
                    </div>
                    {!verified && (
                      <button
                        onClick={() => handleVote(index)}
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                      >
                        Vote
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal for showing players who have marked an event */}
      {modalEventIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-card p-6 rounded-lg w-80">
            <h3 className="text-xl font-bold mb-4">Players for Event {modalEventIndex + 1}</h3>
            <ul className="mb-4">
              {getPlayersForEvent(modalEventIndex).length > 0 ? (
                getPlayersForEvent(modalEventIndex).map((player, idx) => (
                  <li key={idx}>{player.username}</li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">No votes yet</li>
              )}
            </ul>
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
