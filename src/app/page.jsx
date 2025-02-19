import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="relative">
          <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl text-primary">
            OpenBingo
          </h1>
        </div>
        <p className="max-w-[600px] text-xl text-muted-foreground mt-6 mb-8 animate-fade-in">
          The future of bingo is here. Create or join games in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
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
        <div className="w-full py-6 bg-secondary/5 backdrop-blur-md border-y border-secondary/10">
        </div>
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
      </section>
    </div>
  );
}
