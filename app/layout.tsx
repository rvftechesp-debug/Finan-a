import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Tracker from "@/components/Tracker";
import NotificacaoChecker from "@/components/NotificacaoChecker";
import type { Metadata, Viewport } from 'next'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  title: 'RV Finança',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#f97316',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Tracker />
        <NotificacaoChecker />
        {children}
      </body>
    </html>
  );
}
