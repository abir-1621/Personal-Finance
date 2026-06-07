import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Friends & Fund",
  description: "Private monthly savings and deposit tracker for trusted friend groups."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
