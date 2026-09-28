import { Cormorant_Garamond, Manrope } from "next/font/google";

// Loaded once and shared by both root layouts: the site (app/[lang]) and the admin (app/admin).
// latin-ext is required, otherwise Ć, č, đ, š, ž fall back to another font.
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

/** CSS variables of both fonts, for the <html> element (read by app/globals.css). */
export const fontVariables = `${cormorant.variable} ${manrope.variable}`;
