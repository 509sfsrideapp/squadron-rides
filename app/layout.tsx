import ForegroundNotificationBridge from "./components/ForegroundNotificationBridge";
import type { Metadata, Viewport } from "next";
import NotificationNavigationBridge from "./components/NotificationNavigationBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Defender Drivers",
  description: "Request and manage squadron rides with Defender Drivers.",
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ForegroundNotificationBridge />
        <NotificationNavigationBridge />
        <div className="flex-1">{children}</div>
        <footer
          style={{
            padding: "10px 16px 14px",
            fontSize: 12,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          Version 53
        </footer>
      </body>
    </html>
  );
}
