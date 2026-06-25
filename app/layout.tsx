import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import MobileBottomNav from "../components/MobileBottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RELIGIOUS",
  description: "A calm spiritual companion for sacred texts, prayers and places.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#071A2F] text-[#F8FAFC]">
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
