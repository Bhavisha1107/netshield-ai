import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetShield AI",
  description: "Network Anomaly Detection & Threat Monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-base text-text min-h-screen">
        {children}
      </body>
    </html>
  );
}