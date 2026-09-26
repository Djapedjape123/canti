"use client";

import "./globals.css";

// Replaces the root layout when it crashes, so it renders its own <html>/<body>.
// Language is unknown here, so the text is bilingual.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="sr-Latn">
      <body className="grid min-h-svh place-items-center bg-brand-800 px-5 text-center text-cream-50">
        <title>Greška · Error</title>
        <div>
          <p className="font-serif text-5xl font-semibold text-gold-500">ĆANTI</p>
          <h1 className="mt-6 text-xl font-semibold">Došlo je do greške. · Something went wrong.</h1>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-6 text-sm font-semibold text-brand-900 hover:bg-gold-600"
          >
            Pokušaj ponovo · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
