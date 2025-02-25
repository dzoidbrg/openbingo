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
import { useToast } from '@/hooks/use-toast';

export default function GamePage() {
  const { id: gameId } = useParams(); // Get dynamic id from router
  const [game, setGame] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalEventIndex, setModalEventIndex] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGameCode, setShowGameCode] = useState(true);
  const [showExpandedCode, setShowExpandedCode] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy Link');
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const { toast } = useToast();

  // Window focus detection
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    
    // Set initial state
    setIsWindowFocused(document.hasFocus());
    
    // Add event listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Clean up
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        setUserId(session.$id);
      } catch (err) {
        console.error('Error initializing session:', err);
        setError('Failed to initialize session');
      }
    };
    initSession();

    // Fetch initial game data
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
        console.error('Error fetching game:', err);
        setError('Game not found');
        setLoading(false);
      }
    };
    fetchGame();

    // Set up real-time subscription
    const unsubscribe = subscribeRealtime(
      `databases.${BINGO_DATABASE_ID}.collections.${GAMES_COLLECTION_ID}.documents.${gameId}`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.update')) {
          const newGame = response.payload;
          const oldPlayers = game?.players || [];
          const newPlayers = newGame.players || [];
          
          // Check if a new player has joined
          if (newPlayers.length > oldPlayers.length) {
            const latestPlayer = typeof newPlayers[newPlayers.length - 1] === 'string' 
              ? JSON.parse(newPlayers[newPlayers.length - 1]) 
              : newPlayers[newPlayers.length - 1];
            
            toast({
              title: "New Player Joined!",
              description: `${latestPlayer.username} has joined the game!`
            });
          }
          
          setGame(newGame);
        }
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [gameId]); // Add gameId as dependency

  const getCurrentPlayer = () => {
    if (!game?.players || !userId) return null;
    return game.players.find(player => {
      if (typeof player === 'string') {
        try {
          const parsedPlayer = JSON.parse(player);
          return parsedPlayer.userId === userId;
        } catch (e) {
          console.error('Error parsing player:', e);
          return false;
        }
      }
      return player.userId === userId;
    });
  };

  const currentPlayer = getCurrentPlayer();
  const currentUsername = currentPlayer ? 
    (typeof currentPlayer === 'string' ? JSON.parse(currentPlayer).username : currentPlayer.username) 
    : 'Unknown';

  const isHost = game && game.creatorId === userId;

  const handleStartGame = async () => {
    try {
      const payload = JSON.stringify({
        gameId: game.$id
      });
      await functions.createExecution('67b8f901000f4dce9aae', payload);
    } catch (err) {
      console.error('Error starting game:', err);
      // Show error message to user
      setError('Failed to start game. Please try again.');
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

  const handleShare = async () => {
    const joinUrl = `${window.location.origin}/join?code=${game.gameCode}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy Link'), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus('Copy Link'), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
        <div className="mb-6 p-6 bg-secondary/10 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded animate-pulse w-full"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse w-full"></div>
              ))}
            </div>
          </div>
        </div>
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

  return (
    <div className="min-h-screen p-4" suppressHydrationWarning>
      {/* Window Focus Indicator */}
      <div
        className={cn(
          'fixed inset-0 pointer-events-none transition-opacity duration-300 z-50',
          isWindowFocused ? 'opacity-0' : 'opacity-100'
        )}
      >

        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <h2 className="text-primary text-2xl font-bold">Page Out of Focus</h2>
          <p className="text-primary/80 text-center max-w-md px-4">
            Some data might not load while the page isn't focused.
          </p>
        </div>
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Game Code:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-lg">
                {showGameCode ? (game?.gameCode || 'N/A') : '****'}
              </span>
              <div className="flex items-center gap-1">
              <button
                onClick={() => setShowGameCode(!showGameCode)}
                className="p-1 hover:bg-secondary/20 rounded-full transition-colors text-foreground"
                title={showGameCode ? "Hide Code" : "Show Code"}
              >
                {showGameCode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowExpandedCode(true)}
                className="p-1 hover:bg-secondary/20 rounded-full transition-colors text-foreground"
                title="Expand Code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6" />
                  <path d="M9 21H3v-6" />
                  <path d="M21 3l-7 7" />
                  <path d="M3 21l7-7" />
                </svg>
              </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Player:</span>
            <span className="font-medium">
              {currentUsername}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share Game
        </button>
      </div>

      {/* Expanded Code Modal */}
      {showExpandedCode && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowExpandedCode(false);
            }
          }}
        >
          <div className="bg-card p-8 rounded-lg shadow-xl w-96 max-w-[90vw]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Game Code</h3>
              <button
                onClick={() => setShowExpandedCode(false)}
                className="p-2 hover:bg-secondary/20 rounded-full transition-colors text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="bg-background/50 p-6 rounded-lg border-2 border-secondary">
              <span className="font-mono text-4xl tracking-wider">
                {game?.gameCode || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShareModal(false);
            }
          }}
        >
          <div className="bg-card p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Share Game</h3>
            <div className="space-y-4">
              <button
                onClick={handleShare}
                className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
              >
                {copyStatus}
              </button>
              <button
                disabled
                className="w-full px-4 py-2 bg-secondary/50 text-foreground rounded cursor-not-allowed flex items-center justify-center gap-2 relative"
              >
                <span className="line-through">Share via Email</span>
                <span className="text-xs bg-secondary-foreground/10 px-2 py-0.5 rounded absolute -right-1 -top-1">Soon</span>
              </button>
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              className="mt-4 w-full px-4 py-2 border border-input rounded hover:bg-accent hover:text-accent-foreground transition-colors text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Waiting Room */}
      {game.status === 'waiting' && (
        <div className="mb-6 p-6 bg-secondary/10 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {/* Game Info */}
            <div className="space-y-4 md:border-r border-dotted border-border md:pr-6">
              <h3 className="text-xl font-semibold">Game Configuration</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Board Size:</span>
                  <span className="font-medium">{game.boardSize}x{game.boardSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Vote Threshold:</span>
                  <span className="font-medium">{game.votingThreshold}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Events:</span>
                  <span className="font-medium">{game.events.length}</span>
                </div>
              </div>
            </div>

            {/* Players List */}
            <div className="space-y-4 md:pl-6">
              <h3 className="text-xl font-semibold">Players in Lobby</h3>
              <div className="space-y-2">
                {(game.players || []).map((player, index) => {
                  const playerData = typeof player === 'string' ? JSON.parse(player) : player;
                  const isCurrentPlayer = playerData.userId === userId;
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-background/50 rounded">
                      <span className={cn("font-medium", isCurrentPlayer && "font-bold")}>{playerData.username}</span>
                      {playerData.userId === game.creatorId && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Host</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Waiting Message */}
          <div className="mt-6 text-center pt-6 border-t border-dotted border-border">
            {isHost ? (
              <div className="space-y-4">
                <p className="text-lg font-medium">
                  Press "Start Game" to begin!
                </p>
                <button
                  onClick={handleStartGame}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all transform hover:scale-105"
                >
                  Start Game
                </button>
              </div>
            ) : (
              <p className="text-lg font-medium animate-pulse">
                Waiting for host to start the game...
              </p>
            )}
          </div>
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

      {/* Events Preview */}
      <div className="mt-8 p-6 bg-card rounded-lg shadow-sm border border-border">
        <h2 className="text-xl font-semibold mb-4">All Bingo Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {game.events.map((event, index) => (
            <div key={index} className="p-3 bg-background rounded border border-border">
              <span className="text-muted-foreground text-sm mr-2">#{index + 1}</span>
              <span>{event}</span>
            </div>
          ))}
        </div>
      </div>

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