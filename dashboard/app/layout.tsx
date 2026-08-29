import type { Metadata } from "next";
import "./globals.css";
import { RBACProvider } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "AegisPay — Payment Risk Operations & Behavioral Firewall",
  description:
    "Deterministic behavioral intelligence for real-time payment risk — with evidence, replayability, and merchant-safe investigation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface font-sans text-ink antialiased">
        <RBACProvider>{children}</RBACProvider>
      </body>
    </html>
  );
}
