import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: { default: "Glam Delivery", template: "%s — Glam Delivery" },
  description: "Delivery management for Glam",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans antialiased bg-gray-50 text-gray-900 h-full">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
