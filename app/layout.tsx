import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scholarship PDF Maker",
  description: "Split your merged scholarship PDF into clearly named documents. Files stay on your device.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
