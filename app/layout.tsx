import ForegroundNotificationBridge from "./components/ForegroundNotificationBridge";
import AccountAccessGate from "./components/AccountAccessGate";
import BottomUtilityNav from "./components/BottomUtilityNav";
import DeveloperAccessCleaner from "./components/DeveloperAccessCleaner";
import InitialAppSplash from "./components/InitialAppSplash";
import type { Metadata, Viewport } from "next";
import { Manrope, Rajdhani } from "next/font/google";
import NotificationNavigationBridge from "./components/NotificationNavigationBridge";
import ProfileCompletionGate from "./components/ProfileCompletionGate";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Designated Defenders",
  description: "Request and manage squadron rides with Designated Defenders.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/new-logo.jpg",
    shortcut: "/new-logo.jpg",
    apple: "/new-logo.jpg",
  },
  appleWebApp: {
    capable: true,
    title: "509 SFS",
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
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <InitialAppSplash />
        <ForegroundNotificationBridge />
        <NotificationNavigationBridge />
        <DeveloperAccessCleaner />
        <AccountAccessGate />
        <ProfileCompletionGate />
        <div className="flex-1">{children}</div>
        <BottomUtilityNav />
        <footer
          style={{
            padding: "10px 16px 14px",
            fontSize: 12,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          Version 114
        </footer>
      </body>
    </html>
  );
}
