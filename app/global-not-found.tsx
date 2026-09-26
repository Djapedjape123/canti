import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// Used only for URLs that match no route at all (the proxy sends almost everything to /sr first).
// It bypasses app/[lang]/layout.tsx, so it renders its own document.
export const metadata: Metadata = {
  title: "404 · Ćanti Apartmani",
  robots: { index: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="sr-Latn">
      <body className="grid min-h-svh place-items-center bg-brand-800 px-5 text-center text-cream-50">
        <div>
          <p className="font-serif text-7xl font-semibold text-gold-500">404</p>
          <h1 className="mt-6 text-xl font-semibold">Stranica nije pronađena · Page not found</h1>
          <Link
            href="/sr"
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-6 text-sm font-semibold text-brand-900 hover:bg-gold-600"
          >
            Početna · Home
          </Link>
        </div>
      </body>
    </html>
  );
}
