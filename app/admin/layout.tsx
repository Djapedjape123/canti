import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { adminText } from "@/lib/admin-text";
import { fontVariables } from "@/lib/fonts";
import "../globals.css";

// Root layout of the admin panel. It is separate from the public site
// (app/[lang]): Serbian only and never indexed by search engines.

export const metadata: Metadata = {
  title: {
    default: `${adminText.title} · ${adminText.siteName}`,
    template: `%s · ${adminText.siteName}`,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#143b3b",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sr-Latn" className={fontVariables}>
      <body className="min-h-svh bg-cream-100 font-sans text-ink-900 antialiased">{children}</body>
    </html>
  );
}
