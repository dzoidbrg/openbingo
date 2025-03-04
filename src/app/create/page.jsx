'use client';

import { useState, useEffect } from "react";
import { getOrCreateAnonymousSession, functions } from '@/lib/appwrite';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [allowMoreEvents, setAllowMoreEvents] = useState(false);
  const [addFreeSpace, setAddFreeSpace] = useState(false);

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

  // Calculate max events based on board size, accounting for free space if enabled
  const getBoardCapacity = () => {
    const totalSpots = boardSize * boardSize;
    return addFreeSpace ? totalSpots - 1 : totalSpots;
  };

  const maxEvents = allowMoreEvents ? 9999 : getBoardCapacity();

  // Update events when free space setting changes
  useEffect(() => {
    // If allowMoreEvents is false, trim extra events when:
    // 1. Free space is turned on (need one fewer event)
    // 2. Board size changes
    if (!allowMoreEvents) {
      const capacity = getBoardCapacity();
      if (events.length > capacity) {
        setEvents(events.slice(0, capacity));
      }
    }
  }, [addFreeSpace, boardSize, allowMoreEvents]);

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (allowMoreEvents || events.length < maxEvents) {
      setEvents([...events, '']);
    }
  };

  const handleBoardSizeChange = (newSize) => {
    setBoardSize(Number(newSize));
    
    // Only limit events if allowMoreEvents is false
    if (!allowMoreEvents) {
      const newBoardSize = Number(newSize);
      const newCapacity = addFreeSpace 
        ? (newBoardSize * newBoardSize) - 1 
        : newBoardSize * newBoardSize;
        
      if (events.length > newCapacity) {
        setEvents(events.slice(0, newCapacity));
      }
    }
  };

  const handleAllowMoreEventsChange = (checked) => {
    setAllowMoreEvents(checked);
    
    // If turning off "allow more events", trim excess events
    if (!checked) {
      const capacity = getBoardCapacity();
      if (events.length > capacity) {
        setEvents(events.slice(0, capacity));
      }
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

    // Validate event count for board size, considering free space
    const requiredEvents = getBoardCapacity();
    
    if (!allowMoreEvents && events.length < requiredEvents) {
      setError(`Please add at least ${requiredEvents} events to fill the board.`);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Please add at least ${requiredEvents} events to fill the board.`,
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
        gameCode: formattedGameCode,
        randomizeBoards: allowMoreEvents,
        addFreeSpace: addFreeSpace
      };

      const response = await functions.createExecution(
        process.env.APPWRITE_FUNCTION_CREATE_GAME_ID,
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
        process.env.APPWRITE_FUNCTION_JOIN_GAME_ID,
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
          <div className="flex gap-3 p-4 mb-4 text-sm border rounded-lg bg-yellow-500/15 text-yellow-600 border-yellow-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-1"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div className="space-y-1">
              <p>All games will be automatically deleted after 24-48 hours of inactivity.</p>
              <p className="text-xs text-muted-foreground">This can vary based on when the game is created.</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter mb-6 text-primary text-center">Create Game</h1>

          {step === 'form' ? (
            <form className="space-y-6" onSubmit={handleCreateGame}>
              <div className="space-y-2">
                <label className="block text-lg font-medium text-foreground">Board Size</label>
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
                  <label htmlFor="threshold" className="block text-lg font-medium text-foreground">Voting Threshold (%)</label>
                  <div className="relative group">
                    <div className="cursor-help text-muted-foreground">ⓘ</div>
                    <div className="invisible group-hover:visible absolute left-0 top-full mt-2 w-64 p-2 bg-popover text-popover-foreground text-sm rounded-md shadow-lg z-50">
                      The percentage of players that need to vote for an event before it's marked as completed on the bingo board.
                    </div>
                  </div>
                </div>
                <Input type="number" id="threshold" min="1" max="100" defaultValue="50" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="allowMoreEvents" 
                    checked={allowMoreEvents}
                    onCheckedChange={handleAllowMoreEventsChange}
                  />
                  <div className="flex items-center">
                    <label htmlFor="allowMoreEvents" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Allow more events
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help text-muted-foreground">ⓘ</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[220px]">
                            If checked, you can add more events than needed, and each player will get a randomized board from your event pool.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="addFreeSpace" 
                    checked={addFreeSpace}
                    onCheckedChange={setAddFreeSpace}
                  />
                  <div className="flex items-center">
                    <label htmlFor="addFreeSpace" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Add a free space
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help text-muted-foreground">ⓘ</div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[220px]">
                            Add a free space in the center of each player's board.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-lg font-medium text-foreground">
                    Bingo Events 
                    <span className="ml-2 text-sm text-muted-foreground">
                      ({events.length}/{allowMoreEvents ? `${getBoardCapacity()}+` : maxEvents})
                      {addFreeSpace && (
                        <span className="ml-1 text-xs text-lime-600">
                          (includes one free space in center)
                        </span>
                      )}
                    </span>
                  </label>
                  <Button 
                    onClick={handleAddEvent} 
                    disabled={!allowMoreEvents && events.length >= maxEvents} 
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
                {addFreeSpace && events.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    A free space will automatically be placed in the center of each player's board.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={events.length === 0 || events.some(event => !event.trim()) || !userId || isLoading}>
                {isLoading ? "Creating..." : "Create Game"}
              </Button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleJoinAsHost}>
              <div className="space-y-2">
                <label className="block text-lg font-medium text-foreground">Enter your username (Host)</label>
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
              <Button type="submit" className="w-full" disabled={!username.trim() || !userId || isLoading}>
                {isLoading ? "Joining..." : "Join as Host"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}