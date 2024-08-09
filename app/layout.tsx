import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";

const displayFont = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const baseFont = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "RenderQuest - Master WebGL with Interactive Tutorials",
  description: "Learn 3D graphics programming with our interactive WebGL tutorials. Transform your coding skills and create stunning visual experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${baseFont.variable} ${displayFont.variable}`}>
      <body className="font-sans antialiased scroll-smooth">
        {children}
      </body>
    </html>
  );
}