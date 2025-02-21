'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  databases,
  subscribeRealtime,
  BINGO_DATABASE_ID,
  GAMES_COLLECTION_ID,
  getOrCreateAnonymousSession,
  functions
} from '@/lib/appwrite';
import { Share2 } from 'lucide-react';

export default function GamePage() {
  const { id: gameId } = useParams(); // Get dynamic id from router
  const [game, setGame] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalEventIndex, setModalEventIndex] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        setUserId(session.id);
      } catch (err) {
        console.error('Error initializing session:', err);
      }
    };
    initSession();
  }, []);

  // Fetch the game document and subscribe to realtime updates.
  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      try {
        const gameData = await databases.getDocument(
          BINGO_DATABASE_ID,
          GAMES_COLLECTION_ID,
          gameId
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

    // Realtime subscription for game updates and player joins
    const channel = `databases.${BINGO_DATABASE_ID}.collections.${GAMES_COLLECTION_ID}.documents.${gameId}`;
    const unsubscribe = subscribeRealtime(channel, (response) => {
      if (response.payload) {
        setGame(response.payload);
        // Log new player joins
        const currentPlayers = game?.players || [];
        const newPlayers = response.payload.players || [];
        if (newPlayers.length > currentPlayers.length) {
          const latestPlayer = newPlayers[newPlayers.length - 1];
          console.log(`New player joined: ${JSON.parse(latestPlayer).username}`);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  const isHost = game && game.creatorId === userId;

  const handleStartGame = async () => {
    try {
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

  const handleShowModal = (eventIndex) => {
    setModalEventIndex(eventIndex);
  };

  const closeModal = () => {
    setModalEventIndex(null);
  };

  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  }[game?.boardSize] || 'grid-cols-3';

  const getPlayersForEvent = (eventIndex) => {
    return (game?.players || []).filter(player =>
      player.ticked && player.ticked.includes(eventIndex)
    );
  };

  // Check for a win using the current user's personal board.
  const checkWinCondition = () => {
    if (!game || !game.boardSize || !game.players) return false;
    const currentPlayer = game.players.find(player => player.userId === userId);
    if (!currentPlayer || !currentPlayer.ticked) return false;

    const size = game.boardSize;
    const board = Array.from({ length: size }, () => Array(size).fill(false));
    currentPlayer.ticked.forEach(index => {
      const row = Math.floor(index / size);
      const col = index % size;
      board[row][col] = true;
    });

    for (let i = 0; i < size; i++) {
      if (board[i].every(cell => cell)) return true;
    }
    for (let j = 0; j < size; j++) {
      if (board.every(row => row[j])) return true;
    }
    const mainDiagonal = Array(size).fill().every((_, i) => board[i][i]);
    const antiDiagonal = Array(size).fill().every((_, i) => board[i][size - 1 - i]);
    return mainDiagonal || antiDiagonal;
  };

  useEffect(() => {
    if (game && userId && game.status === 'started' && checkWinCondition()) {
      const currentPlayer = game.players.find(player => player.userId === userId);
      const winner = currentPlayer ? currentPlayer.username : 'Unknown';
      if (!game.winner) {
        databases.updateDocument(
          BINGO_DATABASE_ID,
          GAMES_COLLECTION_ID,
          game.$id,
          { winner }
        ).catch(err => console.error('Error updating winner:', err));
      }
      window.location.href = `/winner/${game.$id}`;
    }
  }, [game, userId]);

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

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Game link copied to clipboard!');
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const handleEmailShare = () => {
    const shareUrl = window.location.href;
    const subject = encodeURIComponent('Join my Bingo game!');
    const body = encodeURIComponent(`Join my Bingo game at: ${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen p-4">
      {/* Share button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share Game
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-card p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Share Game</h3>
            <div className="space-y-4">
              <button
                onClick={handleShare}
                className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                Copy Link
              </button>
              <button
                onClick={handleEmailShare}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                Share via Email
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="mt-4 w-full px-4 py-2 border border-input rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Waiting Room */}
      {game.status === 'waiting' && (
        <div className="mb-4 p-4 border border-dashed border-secondary rounded-md">
          <h2 className="text-2xl font-bold mb-2">Waiting Room</h2>
          <p className="mb-2">Players joined:</p>
          <ul className="mb-4">
            {(game.players || []).map((playerString, idx) => {
              try {
                const player = typeof playerString === 'string' ? JSON.parse(playerString) : playerString;
                return <li key={idx} className="py-1">{player.username}</li>;
              } catch (e) {
                console.error('Error parsing player data:', e);
                return null;
              }
            })}
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

      {/* Game Board */}
      {game.status === 'started' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Personal Board */}
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

          {/* Communal Board */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Communal Board</h2>
            <div className="space-y-4">
              {game.events.map((event, index) => {
                const voteCount = (game.votes && game.votes[index]) || 0;
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

      {/* Modal for event details */}
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
