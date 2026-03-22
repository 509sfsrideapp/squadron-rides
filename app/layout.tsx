import type { Metadata, Viewport } from "next";
import NotificationNavigationBridge from "./components/NotificationNavigationBridge";
import "./globals.css";

export const metadata: Metadata = {
  title: "Defender Drivers",
  description: "Request and manage squadron rides with Defender Drivers.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "Defender Drivers",
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
          Version 35
        </footer>
      </body>
    </html>
  );
}
