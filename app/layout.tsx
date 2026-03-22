import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "509 SFS Rides",
  description: "Request and manage squadron rides from any device.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "509 SFS Rides",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
