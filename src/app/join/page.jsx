"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect, Suspense } from 'react';
import { getOrCreateAnonymousSession, functions } from '@/lib/appwrite';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toaster } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";
import dotenv from 'dotenv';

dotenv.config();

function JoinGameContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [gameCode, setGameCode] = useState(['', '', '', '']);
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState('code');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const inputRefs = useRef([]);
  const maxUsernameLength = 20;

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
      setFocusedIndex(0);
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        if (session && session.$id) {
          setUserId(session.$id);
        } else {
          console.error('Invalid session response');
          setError('Failed to initialize session');
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setError('Failed to initialize session');
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && code.length === 4) {
      const codeArray = code.split('');
      setGameCode(codeArray);
      codeArray.forEach((char, index) => {
        if (inputRefs.current[index]) {
          inputRefs.current[index].value = char.toUpperCase();
        }
      });
    }
  }, [searchParams]);

  const handleInput = (index, value) => {
    const newGameCode = [...gameCode];
    const newChar = value.slice(-1).toUpperCase();
    newGameCode[index] = newChar;
    setGameCode(newGameCode);

    if (inputRefs.current[index]) {
      inputRefs.current[index].value = newChar;
    }

    if (newChar && index < 3) {
      inputRefs.current[index + 1].focus();
      setFocusedIndex(index + 1);
    } else if (!newChar && index > 0) {
      inputRefs.current[index - 1].focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (gameCode.join('').length === 4) {
        handleVerifyCode();
      }
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxUsernameLength) {
      setUsername(value);
      setCharCount(value.length);
    }
  };

  const handleVerifyCode = async () => {
    const code = gameCode.join('');
    if (code.length === 4) {
      setIsLoading(true);
      try {
        const payload = JSON.stringify({ gameCode: code });
        const result = await functions.createExecution(process.env.APPWRITE_FUNCTION_SEARCH_GAME_ID, payload);
        const response = JSON.parse(result.responseBody);

        if (response.success && response.game) {
          setStep('username');
          setError('');
          setStatusMessage('Game found! Please enter your username to join.');
          setMessageType('success');
        } else {
          setError(response.error || 'Game not found. Please check the code.');
          setStatusMessage(response.error || 'Game not found. Please check the code.');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Error verifying game:', error);
        setError('Game not found. Please check the code.');
        toast({
          variant: "destructive",
          title: "Error",
          description: 'Game not found. Please check the code.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleJoinGame = async () => {
    const code = gameCode.join('');
    if (code.length === 4 && userId && username.trim()) {
      setIsLoading(true);
      try {
        const searchPayload = JSON.stringify({ gameCode: code });
        const searchResult = await functions.createExecution(process.env.APPWRITE_FUNCTION_SEARCH_GAME_ID, searchPayload);
        const searchResponse = JSON.parse(searchResult.responseBody);

        if (!searchResponse.success || !searchResponse.game) {
          setError(searchResponse.error || 'Game not found');
          toast({
            variant: "destructive",
            title: "Error",
            description: searchResponse.error || 'Game not found',
          });
          return;
        }

        const joinPayload = JSON.stringify({
          gameId: searchResponse.game.$id,
          userId: userId,
          username: username.trim()
        });
        const joinResult = await functions.createExecution(process.env.APPWRITE_FUNCTION_JOIN_GAME_ID, joinPayload);
        const joinResponse = JSON.parse(joinResult.responseBody);

        if (!joinResponse.success) {
          setError(joinResponse.error || "Failed to join game. Ensure you haven't joined already");
          toast({
            variant: "destructive",
            title: "Error",
            description: joinResponse.error || "Failed to join game. Ensure you haven't joined already",
          });
          return;
        }

        toast({
          title: "Success!",
          description: "Joining game...",
        });
        window.location.href = `/game/${searchResponse.game.$id}`;
      } catch (error) {
        console.error('Error joining game:', error);
        setError('Failed to join game. Please try again.');
        toast({
          variant: "destructive",
          title: "Error",
          description: 'Failed to join game. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  return (
    <div className="relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <Card className="w-full max-w-md p-6 shadow-xl bg-card/50 backdrop-blur-sm border-muted/20">
          <CardContent className="space-y-6">
            {statusMessage && (
              <div className={cn(
                "p-4 mb-4 rounded-md text-center",
                messageType === 'success' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                {statusMessage}
              </div>
            )}
            <h1 className="text-4xl font-bold tracking-tighter text-primary text-center">Join the Fun!</h1>
            {step === 'code' ? (
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground text-center">Enter your game code</p>
                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <Input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      onInput={(e) => handleInput(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onFocus={() => handleFocus(index)}
                      className={cn(
                        "w-20 h-24 text-center text-2xl font-bold bg-card border-2",
                        "focus:ring-2 focus:ring-primary transition-all duration-200",
                        focusedIndex === index ? "scale-110 border-primary" : "border-input"
                      )}
                    />
                  ))}
                </div>
                <Button
                  onClick={handleVerifyCode}
                  className="w-full"
                  disabled={gameCode.join('').length !== 4 || !userId || isLoading}
                >
                  {isLoading ? "Verifying..." : "Next"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-lg text-muted-foreground text-center">Choose your username</p>
                <div className="relative">
                  <Input
                    type="text"
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
                <Button
                  onClick={handleJoinGame}
                  className="w-full"
                  disabled={!username.trim() || !userId || isLoading}
                >
                  {isLoading ? "Joining..." : "Join Game"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

export default function JoinGame() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <JoinGameContent />
    </Suspense>
  );
}
