import { notFound } from "next/navigation";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return process.env.NODE_ENV === "development" ? (
    <html lang="en" className="bg-indigo-900 text-white">
      <body>{children}</body>
    </html>
  ) : (
    notFound()
  );
}
