'use client';

import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from 'react';
import { account, getOrCreateAnonymousSession, databases, BINGO_DATABASE_ID, GAMES_COLLECTION_ID, functions } from '@/lib/appwrite';
import { Query } from 'appwrite';

export default function JoinGame() {
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [gameCode, setGameCode] = useState(['', '', '', '']);
  const [userId, setUserId] = useState(null);
  const [step, setStep] = useState('code'); // 'code' or 'username'
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await getOrCreateAnonymousSession();
        setUserId(session.$id);
      } catch (error) {
        console.error('Error initializing session:', error);
      }
    };
    initSession();
  }, []);

  const handleInput = (index, value) => {
    const newGameCode = [...gameCode];
    newGameCode[index] = value.toUpperCase();
    setGameCode(newGameCode);
    
    if (value.length === 1 && index < 3) {
      inputRefs.current[index + 1].focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleVerifyCode = async () => {
    const code = gameCode.join('');
    if (code.length === 4) {
      try {
        const payload = JSON.stringify({ gameCode: code });
        const result = await functions.createExecution('searchGame', payload);
        const response = JSON.parse(result.response);

        if (response.success) {
          setStep('username');
          setError('');
        } else {
          setError(response.message || 'Game not found. Please check the code.');
        }
      } catch (error) {
        console.error('Error verifying game:', error);
        setError('Game not found. Please check the code.');
      }
    }
  };

  const handleJoinGame = async () => {
    const code = gameCode.join('');
    if (code.length === 4 && userId && username.trim()) {
      try {
        // First, get the game ID using searchGame function
        const searchPayload = JSON.stringify({ gameCode: code });
        const searchResult = await functions.createExecution('searchGame', searchPayload);
        const searchResponse = JSON.parse(searchResult.response);

        if (!searchResponse.success) {
          throw new Error('Game not found');
        }

        // Then join the game using joinGame function
        const joinPayload = JSON.stringify({
          gameId: searchResponse.game.$id,
          userId: userId,
          username: username.trim()
        });
        await functions.createExecution('joinGame', joinPayload);
        window.location.href = `/game/${searchResponse.game.$id}`;
      } catch (error) {
        console.error('Error joining game:', error);
        setError('Failed to join game. Please try again.');
      }
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
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
            disabled={gameCode.join('').length !== 4 || !userId}
          >
            Next
          </button>
        </>
      ) : (
        <>
          <p className="text-lg text-muted-foreground mb-4 block">Enter your username to join the game</p>
          <div className="w-full max-w-sm">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className={cn(
                "w-full px-4 py-3 text-lg",
                "bg-background border-2 border-secondary",
                "text-foreground focus:border-primary",
                "outline-none transition-colors rounded-md"
              )}
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <button
            onClick={handleJoinGame}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            disabled={!username.trim() || !userId}
          >
            Join Game
          </button>
        </>
      )}
    </div>
  );
}
