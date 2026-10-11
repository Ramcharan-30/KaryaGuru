import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Micro1 AI Technical Interview | Live Assessment",
  description: "High-fidelity AI technical interview environment with real-time audio and interactive workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full overflow-hidden">
      <body className={`${inter.variable} font-sans h-full w-full overflow-hidden bg-[#08090e] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
