import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YOU. FIRST Elite Lacrosse | Southern Ohio's Premier College Prep Club",
  description:
    "Elite girls' lacrosse club in Cincinnati, Ohio. College prep training, recruiting support, and personal development for competitive female athletes. Part of the Cincinnati Lacrosse Academy.",
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
  // www is the serving host (apex 307-redirects to it) — keeps og:image URLs
  // resolving with a direct 200 for link scrapers.
  metadataBase: new URL("https://www.youfirstlacrosse.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "You. First Elite Lacrosse",
    description:
      "The area's elite club, now with youth teams. Free evaluations through August 7.",
    type: "website",
    locale: "en_US",
    siteName: "You. First Elite Lacrosse",
    url: "https://youfirstlacrosse.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "You. First Elite Lacrosse",
    description:
      "The area's elite club, now with youth teams. Free evaluations through August 7.",
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
