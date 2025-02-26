'use client';

import { useState, useEffect } from 'react';
import { databases, BINGO_DATABASE_ID, GAMES_COLLECTION_ID, getOrCreateAnonymousSession } from '@/lib/appwrite';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function MyGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        if (session && session.$id) {
          setUserId(session.$id);
          fetchUserGames(session.$id);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setError('Session expired or not initialized');
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const fetchUserGames = async (currentUserId) => {
    try {
      const response = await databases.listDocuments(
        BINGO_DATABASE_ID,
        GAMES_COLLECTION_ID
      );

      // Filter games where the user is a participant
      const userGames = response.documents.filter(game => {
        return game.players.some(player => {
          try {
            const playerData = typeof player === 'string' ? JSON.parse(player) : player;
            return playerData.userId === currentUserId;
          } catch (e) {
            console.error('Error parsing player data:', e);
            return false;
          }
        });
      });

      setGames(userGames);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching games:', error);
      setError('Failed to load games');
      setLoading(false);
    }
  };

  const router = useRouter();

  const handleRejoin = (gameId) => {
    router.push(`/game/${gameId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <h1 className="text-2xl font-bold p-6">My Games</h1>
        <div className="p-6">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Game Code</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-8"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !userId) {
    return (
      <div className="min-h-screen flex flex-col">
        <h1 className="text-2xl font-bold p-6">My Games</h1>
        <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
          Either you have not joined any games yet, or your session has expired!
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold p-6">My Games</h1>
      <div className="p-6">
        <Card>
          <CardContent>
            {games.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Either you have not joined any games yet, or your session has expired!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Game Code</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game.$id}>
                      <TableCell className="font-medium">
                        {game.gameCode}
                        {game.creatorId === userId && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">Host</span>
                        )}
                      </TableCell>
                      <TableCell>{game.players?.length || 0}</TableCell>
                      <TableCell>{game.events?.length || 0}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          game.status === 'waiting' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : game.status === 'started'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleRejoin(game.$id)}
                          variant="secondary"
                          size="sm"
                        >
                          Rejoin Game
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}