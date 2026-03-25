import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mercator — Economic Strategy Arena",
  description:
    "Compete as rival nations in a turn-based economic strategy game. Build, trade, and grow your empire.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0e17] text-gray-200 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
