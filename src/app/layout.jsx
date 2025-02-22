import { ThemeProvider } from "@/components/theme-provider"
import { Inter } from "next/font/google";
import { ModeToggle } from "@/components/mode-toggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OpenBingo - Create and Share Bingo Games",
  description: "Create, share, and play bingo games with friends. The modern way to make bingo fun and engaging.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen bg-background font-sans antialiased">
            <div className="fixed top-4 right-4 z-50">
              <ModeToggle />
            </div>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}

