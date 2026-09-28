"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-access";
import { adminText } from "@/lib/admin-text";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      // Supabase removes the session cookies even when the network call fails.
      await createSupabaseBrowserClient().auth.signOut();
    } finally {
      router.replace(ADMIN_LOGIN_PATH);
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={logout} disabled={pending} className={buttonClasses("outline-light")}>
      {pending ? adminText.nav.loggingOut : adminText.nav.logout}
    </button>
  );
}
