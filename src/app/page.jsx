import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { BingoScene } from "@/components/3d/BingoScene";

export default function LandingPage() {
  return (
    <div className="relative overflow-x-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm">
        <BingoScene />
      </div>
      
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-24 text-center relative z-10">
        <Link
          href="https://github.com/yourusername/openbingo"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 mb-8",
            "bg-secondary/10 hover:bg-secondary/20",
            "rounded-full transition-all duration-300",
            "text-sm text-muted-foreground",
            "animate-fade-in-up hover:scale-105 hover:shadow-lg"
          )}
        >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          View source code
        </Link>
        <div className="relative animate-fade-in-up">
          <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl text-primary">
            OpenBingo
          </h1>
        </div>
        <p className="max-w-[600px] text-xl text-muted-foreground mt-6 mb-8 animate-fade-in">
          The future of bingo is here. Create or join games in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 mb-8 animate-fade-in-up delay-200">
          <Link
            href="/create"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "bg-primary text-primary-foreground",
              "h-12 px-8 text-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
            )}
          >
            Create Game
          </Link>
          <Link
            href="/join"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "border-2 border-secondary bg-background/50 text-foreground hover:bg-secondary/10",
              "h-12 px-8 text-lg font-medium backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
            )}
          >
            Join Game
          </Link>
        </div>

        {/* Features Strip */}
        <div className="w-full py-6 bg-secondary/5 backdrop-blur-md border-y border-secondary/10 animate-fade-in-up delay-300">
          <div className="container mx-auto px-4">
            <div className="flex justify-center gap-24 text-center">
              <div className="flex items-center gap-2">
                <Image src="/file.svg" alt="Create" width={20} height={20} className="opacity-75" />
                <span className="text-sm text-muted-foreground">Custom Boards</span>
              </div>
              <div className="flex items-center gap-2">
                <Image src="/globe.svg" alt="Share" width={20} height={20} className="opacity-75" />
                <span className="text-sm text-muted-foreground">Instant Sharing</span>
              </div>
              <div className="flex items-center gap-2">
                <Image src="/window.svg" alt="Play" width={20} height={20} className="opacity-75" />
                <span className="text-sm text-muted-foreground">Real-time Play</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-24 relative z-10 bg-secondary/5 backdrop-blur-md">
        <h2 className="text-4xl font-bold tracking-tighter mb-12 text-primary animate-fade-in-up">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-6 rounded-lg bg-background/50 backdrop-blur-md border border-secondary/20 animate-fade-in-up delay-100">
            <h3 className="text-xl font-semibold mb-4">1. Create Your Game</h3>
            <p className="text-muted-foreground">Design your custom bingo board with your own events and set voting rules for verification.</p>
          </div>
          <div className="p-6 rounded-lg bg-background/50 backdrop-blur-md border border-secondary/20 animate-fade-in-up delay-200">
            <h3 className="text-xl font-semibold mb-4">2. Share & Join</h3>
            <p className="text-muted-foreground">Invite players with a simple code or link. Join instantly from any device, no installation needed.</p>
          </div>
          <div className="p-6 rounded-lg bg-background/50 backdrop-blur-md border border-secondary/20 animate-fade-in-up delay-300">
            <h3 className="text-xl font-semibold mb-4">3. Play Together</h3>
            <p className="text-muted-foreground">Vote on events in real-time. Watch as the community verifies each event through democratic consensus.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-24 relative z-10">
        <h2 className="text-4xl font-bold tracking-tighter mb-12 text-primary animate-fade-in-up">Features</h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="flex flex-col gap-8 animate-fade-in-up delay-100">
            <div className="p-6 rounded-lg bg-background/50 backdrop-blur-md border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4">Real-time Interaction</h3>
              <p className="text-muted-foreground">Experience seamless real-time updates as players join, vote, and verify events.</p>
            </div>
            <div className="p-6 rounded-lg bg-background/50 backdrop-blur-md border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4">Custom Game Rules</h3>
              <p className="text-muted-foreground">Set custom voting thresholds and board sizes to match your group's preferences.</p>
            </div>
          </div>
          <div className="flex flex-col gap-8 animate-fade-in-up delay-200">
            <div className="p-6 rounded-lg bg-background/50 backdrop-blur-md border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4">Democratic Verification</h3>
              <p className="text-muted-foreground">Events are verified through community consensus, ensuring fair play.</p>
            </div>
            <div className="p-6 rounded-lg bg-background/50 backdrop-blur-md border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4">No Installation Required</h3>
              <p className="text-muted-foreground">Play instantly in your browser on any device. No downloads, no hassle.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-24 relative z-10 bg-secondary/5 backdrop-blur-md">
        <h2 className="text-4xl font-bold tracking-tighter mb-6 text-primary animate-fade-in-up">Ready to Play?</h2>
        <p className="max-w-[600px] text-xl text-muted-foreground mb-8 text-center animate-fade-in-up delay-100">
          Join thousands of players and experience the next generation of bingo gaming.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up delay-200">
          <Link
            href="/create"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "bg-primary text-primary-foreground",
              "h-12 px-8 text-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
            )}
          >
            Start Now
          </Link>
          <Link
            href="/join"
            className={cn(
              "inline-flex items-center justify-center rounded-full",
              "border-2 border-secondary bg-background/50 text-foreground hover:bg-secondary/10",
              "h-12 px-8 text-lg font-medium backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
            )}
          >
            Join Existing Game
          </Link>
        </div>
      </section>

      {/* Scroll Indicator - Removed opacity transition */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-50" id="scrollIndicator">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>

      {/* Scroll event listener script with transition */}
      <script dangerouslySetInnerHTML={{ __html: `
        window.addEventListener('scroll', function() {
          const scrollIndicator = document.getElementById('scrollIndicator');
          if (scrollIndicator) {
            scrollIndicator.style.transition = 'opacity 0.3s ease';
            if (window.scrollY > 100) {
              scrollIndicator.style.opacity = '0';
              scrollIndicator.style.pointerEvents = 'none';
            } else {
              scrollIndicator.style.opacity = '1';
              scrollIndicator.style.pointerEvents = 'auto';
            }
          }
        });
      ` }} />
    </div>
  );
}

