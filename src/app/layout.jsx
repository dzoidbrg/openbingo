import { ThemeProvider } from "@/components/theme-provider"
import { Inter } from "next/font/google";
import { Navbar } from "@/components/ui/navbar";
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
          <div className="min-h-screen bg-background font-sans antialiased relative">
            <div className="fixed top-0 left-0 right-0 z-50 bg-background">
              <Navbar />
            </div>
            <main className="pt-16">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

