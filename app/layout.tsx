import type { Metadata } from "next";
import "./globals.css";
import "./mobile.css";

export const metadata: Metadata = {
  title: "ELEVEN — Dari Lokal Jadi Legenda",
  description: "Mulai dari Pra-Regional, bangun pemainmu, dan bawa klub menuju panggung Asia. Simulasi karier sepak bola.",
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
