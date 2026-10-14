import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { headers } from 'next/headers';

// Rubik is a highly readable, modern font that fully supports Hebrew
const rubik = Rubik({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')),
  title: "Shutaf",
  description: "Marketplace for Apartments and Roommates in Beer Sheva",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const en = (await headers()).get('x-shutaf-locale') === 'en';
  return (
    // Set RTL direction natively for Hebrew
    <html lang={en ? 'en' : 'he'} dir={en ? 'ltr' : 'rtl'}>
      <body className={`${rubik.className} antialiased min-h-screen bg-gray-50 flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
