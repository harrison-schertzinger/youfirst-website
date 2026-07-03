import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YOU. FIRST Elite Lacrosse | Girls' Lacrosse in Cincinnati — Pricing & Programs Published",
  description:
    "Elite girls' lacrosse club in Cincinnati, Ohio. Jumpstart, Launch, and Elite programs with every price, practice block, and tournament published. Tryouts July 11. Part of the Cincinnati Lacrosse Academy.",
  keywords: [
    "girls lacrosse Cincinnati",
    "elite lacrosse club Ohio",
    "college prep lacrosse",
    "lacrosse recruiting",
    "Cincinnati Lacrosse Academy",
    "youth lacrosse training",
    "competitive girls lacrosse",
    "Southern Ohio lacrosse",
    "girls club lacrosse",
  ],
  metadataBase: new URL("https://youfirstlacrosse.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "YOU. FIRST Elite Lacrosse",
    description:
      "Southern Ohio's premier college prep girls' lacrosse club. Build & Bring the Best Together.",
    type: "website",
    locale: "en_US",
    siteName: "YOU. FIRST Elite Lacrosse",
    url: "https://youfirstlacrosse.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "YOU. FIRST Elite Lacrosse",
    description:
      "Southern Ohio's premier college prep girls' lacrosse club. Build & Bring the Best Together.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// JSON-LD structured data
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SportsTeam",
      name: "YOU. FIRST Elite Lacrosse",
      alternateName: "You. First Elite Lacrosse Club",
      sport: "Lacrosse",
      url: "https://youfirstlacrosse.com",
      description:
        "Elite girls' lacrosse club in Cincinnati, Ohio. College prep training, recruiting support, and personal development for competitive female athletes.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Cincinnati",
        addressRegion: "OH",
        addressCountry: "US",
      },
      parentOrganization: {
        "@type": "SportsOrganization",
        name: "Cincinnati Lacrosse Academy",
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "kathleen@youfirstlacrosse.com",
        contactType: "general",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://youfirstlacrosse.com",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
