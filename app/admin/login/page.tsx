import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminText } from "@/lib/admin-text";

export const metadata: Metadata = { title: adminText.login.title };

// The proxy sends the owner straight to the calendar if they are already logged in.
export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-serif text-4xl font-semibold tracking-wide text-brand-800">ĆANTI</p>
          <span aria-hidden="true" className="mx-auto mt-2 block h-px w-16 bg-gold-500" />
        </div>

        <div className="mt-6 rounded-xl bg-cream-50 p-6 shadow-sm ring-1 ring-sand-200">
          <h1 className="font-serif text-2xl font-semibold text-ink-900">{adminText.login.title}</h1>
          <p className="mt-1 text-sm text-ink-600">{adminText.login.subtitle}</p>
          <LoginForm forbidden={error === "forbidden"} />
        </div>
      </div>
    </main>
  );
}
