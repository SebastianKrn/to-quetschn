import type { Metadata } from "next";
import "./globals.css";
import { getWebEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "GriffTab",
  description: "Standard notation to Griffschrift converter"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  getWebEnv();

  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
