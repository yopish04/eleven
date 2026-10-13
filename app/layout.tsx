import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELEVEN — Your career. Your Asia.",
  description: "Bangun karier, pimpin sebelas pemain, dan taklukkan Asia. Prototipe simulasi sepak bola berbasis statistik.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
