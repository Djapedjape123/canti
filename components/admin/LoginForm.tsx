"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { ADMIN_HOME_PATH } from "@/lib/admin-access";
import { adminText } from "@/lib/admin-text";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const text = adminText.login;

const inputClasses =
  "min-h-11 w-full rounded-lg border border-sand-200 bg-white px-3 text-base text-ink-900 focus:border-brand-800";

type LoginFormProps = {
  /** The proxy sent a logged-in account that is not the owner's back here. */
  forbidden: boolean;
};

export function LoginForm({ forbidden }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(forbidden ? text.forbidden : null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    setPending(true);
    setError(null);
    try {
      const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.code === "invalid_credentials" ? text.wrongCredentials : text.genericError);
        setPending(false);
        return;
      }
      // The session is now in cookies, so the proxy and the pages can see it.
      router.replace(ADMIN_HOME_PATH);
      router.refresh();
    } catch {
      setError(text.genericError);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="login-email" className="text-sm font-semibold text-ink-900">
          {text.email}
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className={inputClasses}
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="login-password" className="text-sm font-semibold text-ink-900">
          {text.password}
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClasses}
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-sand-200 bg-cream-100 px-3 py-2 text-sm font-semibold text-ink-900">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={buttonClasses("dark", "w-full")}>
        {pending ? text.submitting : text.submit}
      </button>
    </form>
  );
}
