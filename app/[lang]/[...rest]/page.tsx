import { notFound } from "next/navigation";

// Any unknown URL under /sr or /en shows our styled 404 inside the site layout.
export default function CatchAll() {
  notFound();
}
