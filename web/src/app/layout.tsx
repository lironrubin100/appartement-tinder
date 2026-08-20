import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

// Rubik is a highly readable, modern font that fully supports Hebrew
const rubik = Rubik({ subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "Shutaf",
  description: "Marketplace for Apartments and Roommates in Beer Sheva",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Set RTL direction natively for Hebrew
    <html lang="he" dir="rtl">
      <body className={`${rubik.className} antialiased min-h-screen bg-gray-50 flex flex-col`}>
        {children}
      </body>
    </html>
  );
}
