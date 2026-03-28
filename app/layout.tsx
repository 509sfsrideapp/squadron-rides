import ForegroundNotificationBridge from "./components/ForegroundNotificationBridge";
import AccountAccessGate from "./components/AccountAccessGate";
import BottomHomeButton from "./components/BottomHomeButton";
import BottomUtilityNav from "./components/BottomUtilityNav";
import DeveloperAccessCleaner from "./components/DeveloperAccessCleaner";
import InitialAppSplash from "./components/InitialAppSplash";
import PullToRefresh from "./components/PullToRefresh";
import SelfDestructOverlay from "./components/SelfDestructOverlay";
import TacticalBackground from "./components/TacticalBackground";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import NotificationNavigationBridge from "./components/NotificationNavigationBridge";
import ProfileCompletionGate from "./components/ProfileCompletionGate";
import { CURRENT_APP_VERSION } from "../lib/app-version";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display-face",
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Defender One",
  description: "Request and manage squadron rides with Defender One.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/defender-one-icon.jpeg",
    shortcut: "/defender-one-icon.jpeg",
    apple: "/defender-one-icon.jpeg",
  },
  appleWebApp: {
    capable: true,
    title: "Defender One",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05070d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TacticalBackground />
        <div className="app-shell">
          <InitialAppSplash />
          <SelfDestructOverlay />
          <PullToRefresh />
          <ForegroundNotificationBridge />
          <NotificationNavigationBridge />
          <DeveloperAccessCleaner />
          <AccountAccessGate />
          <ProfileCompletionGate />
          <div className="flex-1">{children}</div>
          <BottomHomeButton />
          <BottomUtilityNav />
          <footer
            style={{
              padding: "10px 16px 14px",
              fontSize: 12,
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Version {CURRENT_APP_VERSION}
          </footer>
        </div>
      </body>
    </html>
  );
}
