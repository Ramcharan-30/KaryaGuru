import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Karya Guru | AI Technical Interview & Live Assessment",
  description: "Next-generation live AI technical interviewer layout built with Monaco Editor, Excalidraw, and Sarvam AI.",
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
