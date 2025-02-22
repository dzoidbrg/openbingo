'use client';

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { account, createGame, getOrCreateAnonymousSession, functions } from '@/lib/appwrite';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";

const FUNCTION_IDS = {
  CREATE_GAME: '67b74156001710462423',
  JOIN_GAME: '67b713e9000667794adc'
};

export default function CreateGame() {
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const { toast } = useToast();
  const [boardSize, setBoardSize] = useState(3);
  const [events, setEvents] = useState([]);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('form');
  const [createdGame, setCreatedGame] = useState(null);
  const [username, setUsername] = useState('');
  const maxUsernameLength = 20;
  const [charCount, setCharCount] = useState(0);

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxUsernameLength) {
      setUsername(value);
      setCharCount(value.length);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        if (session && session.$id) {
          setUserId(session.$id);
        } else {
          console.error('Invalid session response');
          setError('Session not initialized. Please try again.');
          toast({
            variant: "destructive",
            title: "Error",
            description: "Session not initialized. Please try again.",
          });
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setError('Session not initialized. Please try again.');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Session not initialized. Please try again.",
        });
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
    setBoardSize(Number(newSize));
    const newMaxEvents = Number(newSize) * Number(newSize);
    if (events.length > newMaxEvents) {
      setEvents(events.slice(0, newMaxEvents));
    }
  };

  const handleEventChange = (index, value) => {
    const newEvents = [...events];
    newEvents[index] = value;
    setEvents(newEvents);
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!userId) {
      setError('Session not initialized. Please try again.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Session not initialized. Please try again.",
      });
      setIsLoading(false);
      return;
    }

    if (events.length === 0) {
      setError('Please add at least one event.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one event.",
      });
      setIsLoading(false);
      return;
    }

    if (events.some(event => !event.trim())) {
      setError('All events must have content.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "All events must have content.",
      });
      setIsLoading(false);
      return;
    }

    const gameData = `${userId}-${boardSize}-${events.join('')}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(gameData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const gameCode = parseInt(hashHex.slice(0, 8), 16) % 10000;
    const formattedGameCode = gameCode.toString().padStart(4, '0');

    try {
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

      const result = JSON.parse(response.responseBody);
      
      if (result.success === false) {
        throw new Error(result.error || 'Failed to create game');
      }

      if (!result.game || !result.game.$id) {
        throw new Error('Invalid game data received');
      }

      setCreatedGame(result.game);
      toast({
        title: "Success!",
        description: "Game created successfully. Please enter your username to continue.",
      });
      setStep('username');
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to create game. Please try again.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create game. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinAsHost = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a valid username.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a valid username.",
      });
      setIsLoading(false);
      return;
    }

    if (!createdGame || !createdGame.$id) {
      setError('Game not found. Please try again.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Game not found. Please try again.",
      });
      setIsLoading(false);
      return;
    }

    if (!userId) {
      setError('Session not initialized. Please try again.');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Session not initialized. Please try again.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const joinPayload = {
        gameId: createdGame.$id,
        userId: userId,
        username: trimmedUsername
      };

      const response = await functions.createExecution(
        FUNCTION_IDS.JOIN_GAME,
        JSON.stringify(joinPayload)
      );

      const result = JSON.parse(response.responseBody);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to join game');
      }

      toast({
        title: "Success!",
        description: "Joining game as host...",
      });
      window.location.href = `/game/${createdGame.$id}`;
    } catch (error) {
      console.error('Error joining game as host:', error);
      setError(error.message || 'Failed to join game as host. Please try again.');
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to join game as host. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardContent className="p-6">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tighter mb-6 text-primary text-center"
          >
            Create Game
          </motion.h1>

          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.form
                key="create-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
                onSubmit={handleCreateGame}
              >
                <div className="space-y-2">
                  <label className="block text-lg font-medium text-foreground">
                    Board Size
                  </label>
                  <Select value={boardSize.toString()} onValueChange={handleBoardSizeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select board size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 x 3</SelectItem>
                      <SelectItem value="4">4 x 4</SelectItem>
                      <SelectItem value="5">5 x 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  <Input
                    type="number"
                    id="threshold"
                    min="1"
                    max="100"
                    defaultValue="50"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-lg font-medium text-foreground">
                      Bingo Events ({events.length}/{maxEvents})
                    </label>
                    <Button
                      onClick={handleAddEvent}
                      disabled={events.length >= maxEvents}
                      variant="secondary"
                      size="sm"
                    >
                      Add Event
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {events.map((event, index) => (
                      <Input
                        key={index}
                        value={event}
                        onChange={(e) => handleEventChange(index, e.target.value)}
                        placeholder={`Event ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={events.length === 0 || events.some(event => !event.trim()) || !userId || isLoading}
                >
                  {isLoading ? "Creating..." : "Create Game"}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="username-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
                onSubmit={handleJoinAsHost}
              >
                <div className="space-y-2">
                  <label className="block text-lg font-medium text-foreground">
                    Enter your username (Host)
                  </label>
                  <div className="relative">
                    <Input
                      value={username}
                      onChange={handleUsernameChange}
                      placeholder="Your username"
                      maxLength={maxUsernameLength}
                      className="pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {charCount}/{maxUsernameLength}
                    </span>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!username.trim() || !userId || isLoading}
                >
                  {isLoading ? "Joining..." : "Join as Host"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}