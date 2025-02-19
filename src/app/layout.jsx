import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OpenBingo - Create and Share Bingo Games",
  description: "Create, share, and play bingo games with friends and colleagues. The modern way to make bingo fun and engaging.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        <main className="min-h-screen bg-background font-sans antialiased">
          {children}
        </main>
      </body>
    </html>
  );
}

