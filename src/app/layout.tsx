import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "You. First Elite Lacrosse | Southern Ohio's Premier College Prep Club",
  description:
    "You. First Elite Lacrosse is Cincinnati's premier girls' lacrosse club, developing elite players and young women who compete at the highest level. Part of the Cincinnati Lacrosse Academy.",
  keywords: [
    "girls lacrosse",
    "Cincinnati lacrosse",
    "elite lacrosse club",
    "college prep lacrosse",
    "Southern Ohio lacrosse",
    "youth lacrosse",
    "Cincinnati Lacrosse Academy",
  ],
  openGraph: {
    title: "You. First Elite Lacrosse",
    description:
      "Southern Ohio's premier college prep girls' lacrosse club. Build & Bring the Best Together.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
