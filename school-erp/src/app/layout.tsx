import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers/app-providers";

export const metadata: Metadata = {
  title: "Bright Future School | School ERP",
  description: "Complete School Management System - Foundation Layer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
