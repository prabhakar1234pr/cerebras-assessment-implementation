import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cerebras Perf Projection Explorer",
  description:
    "Upload perf projection sweeps — customer go/no-go and engineer sanity-check views.",
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
