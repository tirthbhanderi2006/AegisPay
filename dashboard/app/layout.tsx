import type { Metadata } from "next";
import "./globals.css";
import { RBACProvider } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "AegisPay — Deterministic Risk Infrastructure for Modern Payments",
  description:
    "Deterministic behavioral intelligence for real-time payment risk — sub-10ms evaluation, frozen calibration, and immutable auditability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=clash-display@400,600,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas text-ink font-sans antialiased min-h-screen">
        <RBACProvider>{children}</RBACProvider>
      </body>
    </html>
  );
}
