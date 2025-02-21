'use client';

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from 'react';
import { account, getOrCreateAnonymousSession, databases, BINGO_DATABASE_ID, GAMES_COLLECTION_ID, functions } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useSearchParams } from 'next/navigation';

export default function JoinGame() {
  const searchParams = useSearchParams();
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [gameCode, setGameCode] = useState(['', '', '', '']);
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState('code'); // 'code' or 'username'
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const inputRefs = useRef([]);
  const maxUsernameLength = 20;

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

  // Handle URL parameter for game code
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && code.length === 4) {
      const codeArray = code.split('');
      setGameCode(codeArray);
      // Auto-fill the input boxes
      codeArray.forEach((char, index) => {
        if (inputRefs.current[index]) {
          inputRefs.current[index].value = char.toUpperCase();
        }
      });
    }
  }, [searchParams]);

  const handleInput = (index, value) => {
    const newGameCode = [...gameCode];
    const upperValue = value.toUpperCase();
    newGameCode[index] = upperValue;
    setGameCode(newGameCode);
    
    if (upperValue.length === 1 && index < 3) {
      inputRefs.current[index + 1].focus();
      setFocusedIndex(index + 1);
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
        const result = await functions.createExecution('67b741820010d7638006', payload);
        const response = JSON.parse(result.responseBody);
        
        if (response.success && response.game) {
          setStep('username');
          setError('');
        } else {
          setError(response.error || 'Game not found. Please check the code.');
        }
      } catch (error) {
        console.error('Error verifying game:', error);
        setError('Game not found. Please check the code.');
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
        const searchResult = await functions.createExecution('67b741820010d7638006', searchPayload);

        const searchResponse = JSON.parse(searchResult.responseBody);
        console.log(searchResponse)
        if (!searchResponse.success || !searchResponse.game) {
          setError(searchResponse.error || 'Game not found');
          return;
        }

        const joinPayload = JSON.stringify({
          gameId: searchResponse.game.$id,
          userId: userId,
          username: username.trim()
        });
        const joinResult = await functions.createExecution('67b713e9000667794adc', joinPayload);
        const joinResponse = JSON.parse(joinResult.responseBody);
        console.log(joinResponse)
        if (!joinResponse.success) {
          setError(joinResponse.error || "Failed to join game. Ensure you haven't joined already");
          return;
        }

        window.location.href = `/game/${searchResponse.game.$id}`;
      } catch (error) {
        console.error('Error joining game:', error);
        setError('Failed to join game. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4" suppressHydrationWarning>
      <h1 className="text-4xl font-bold tracking-tighter mb-2 text-[#FFD700] block">Join the fun!</h1>
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        step === 'username' ? "h-0 opacity-0 overflow-hidden" : "h-auto opacity-100"
      )}>
        {error && <p className="text-red-500 mb-4">{error}</p>}
      </div>
      {step === 'code' ? (
        <>
          <p className="text-lg text-muted-foreground mb-4 block">Enter your code in the boxes below</p>
          <div className="w-full max-w-sm flex justify-center gap-2">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength={1}
                onInput={(e) => {
                  handleInput(index, e.target.value);
                }}
                onFocus={() => handleFocus(index)}
                className={cn(
                  "w-16 h-20 text-center text-2xl font-bold",
                  "bg-background border-2 border-secondary",
                  "text-foreground focus:border-primary",
                  "outline-none transition-colors rounded-md",
                  "transform transition-transform duration-200",
                  focusedIndex === index && focusedIndex !== null ? "-translate-y-1" : ""
                )}
              />
            ))}
          </div>
          <button
            onClick={handleVerifyCode}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            disabled={gameCode.join('').length !== 4 || !userId || isLoading}
          >
            {isLoading ? (
              <div
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            ) : 'Next'}
          </button>
        </>
      ) : (
        <>
          <p className="text-lg text-muted-foreground mb-4 block">Enter your username to join the game</p>
          <div className="w-full max-w-sm">
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Your username"
                maxLength={maxUsernameLength}
                className={cn(
                  "w-full px-4 py-3 text-lg pr-16",
                  "bg-background border-2 border-secondary",
                  "text-foreground focus:border-primary",
                  "outline-none transition-colors rounded-md"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {charCount}/{maxUsernameLength}
              </span>
            </div>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <button
            onClick={handleJoinGame}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            disabled={!username.trim() || !userId || isLoading}
          >
            {isLoading ? (
              <div
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                role="status"
              >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            ) : 'Join Game'}
          </button>
        </>
      )}
    </div>
  );
}
