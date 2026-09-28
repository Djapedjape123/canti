import { redirect } from "next/navigation";
import { ADMIN_HOME_PATH } from "@/lib/admin-access";

// /admin has no page of its own yet: it opens the price calendar.
export default function AdminHomePage() {
  redirect(ADMIN_HOME_PATH);
}
