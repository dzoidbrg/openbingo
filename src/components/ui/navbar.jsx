"use client";

import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-8 relative">
        <Link href="/" className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">
          OpenBingo
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/create" 
            className="text-foreground/80 hover:text-foreground transition-colors"
          >
            Create Game
          </Link>
          <Link 
            href="/join" 
            className="text-foreground/80 hover:text-foreground transition-colors"
          >
            Join Game
          </Link>
          <Link 
            href="/my-games" 
            className="text-foreground/80 hover:text-foreground transition-colors"
          >
            My Games
          </Link>
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}