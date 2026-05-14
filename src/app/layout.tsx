import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CCOS",
  description: "Content Operations Claude Code Operating System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        <nav className="border-b border-gray-200 px-6 py-3">
          <ul className="flex gap-6 text-sm font-medium">
            <li>
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/brand-profile"
                className="text-gray-700 hover:text-blue-600"
              >
                Brand Profile
              </Link>
            </li>
            <li>
              <Link
                href="/knowledge"
                className="text-gray-700 hover:text-blue-600"
              >
                Knowledge
              </Link>
            </li>
            <li>
              <Link
                href="/planning"
                className="text-gray-700 hover:text-blue-600"
              >
                Planning
              </Link>
            </li>
            <li>
              <Link
                href="/content-schedules"
                className="text-gray-700 hover:text-blue-600"
              >
                Schedules
              </Link>
            </li>
            <li>
              <Link
                href="/signals"
                className="text-gray-700 hover:text-blue-600"
              >
                Signals
              </Link>
            </li>
          </ul>
        </nav>
        {children}
      </body>
    </html>
  );
}
