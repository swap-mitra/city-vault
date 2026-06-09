import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "City Vault",
  description: "A bold IPFS workspace for uploading, tracking, and managing files with scoped ownership.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
