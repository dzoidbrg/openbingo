'use client';

import { useEffect, useState } from 'react';
import { databases, BINGO_DATABASE_ID, GAMES_COLLECTION_ID } from '@/lib/appwrite';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function WinnerPage({ params }) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch the game document to get the winner info.
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
        console.error('Error fetching game:', err);
        setError('Failed to load game');
        setLoading(false);
      }
    };
    fetchGame();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-red-500">{error || 'Game not found'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-5xl font-bold text-primary mb-6">We Have a Winner!</h1>
      <p className="text-2xl mb-4">Congratulations, <span className="font-semibold">{game.winner ? game.winner : 'Unknown Player'}</span>!</p>
      <p className="mb-8">We hope you enjoyed this game!.</p>
      <Link
        href="/"
        className={cn(
          "px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors",
          "text-lg font-medium"
        )}
      >
        Return to Home
      </Link>
      
    </div>
  );
}
