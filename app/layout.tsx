import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: { default: "Drop", template: "%s — Drop" },
  description: "Delivery management for Drop",
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
