import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "City Vault",
  description: "IPFS File Vault",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
