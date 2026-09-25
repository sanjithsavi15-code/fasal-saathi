import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Source_Sans_3, Fraunces } from "next/font/google";
import { Providers } from "@/app/components/providers";
import { AppShell } from "@/app/components/app-shell";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Fasal Saathi | Crop Disease Detection & Risk Mitigation",
  description:
    "Farmer-centric crop disease detection, weather-aware risk mapping, and RL-guided prevention for Indian agriculture.",
  applicationName: "Fasal Saathi",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a16" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
