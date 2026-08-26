import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AegisPay — Chargeback Defense Command",
  description:
    "Autonomous chargeback defense and AI-driven evidence triangulation command dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
