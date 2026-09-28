import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { adminText } from "@/lib/admin-text";
import { jsonError, logError, readJson, validationError } from "@/lib/api";
import { getApartmentBySlug } from "@/lib/apartments";
import { daysInclusive } from "@/lib/dates";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resetPricesSchema, setPricesSchema } from "@/lib/validation";

// The owner's prices for single days (table price_overrides).
// `to` is INCLUDED: the owner picks days, so 31.12 – 2.1 is 3 days = 3 rows.

/** PUT { slug, from, to, price }: the same price for every day from `from` to `to`. */
export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const parsed = setPricesSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const { slug, from, to, price } = parsed.data;

    const apartment = await getApartmentBySlug(slug);
    if (!apartment) return jsonError(adminText.api.apartmentNotFound, 404);

    const rows = daysInclusive(from, to).map((date) => ({ apartment_id: apartment.id, date, price }));
    // (apartment_id, date) is the primary key, so an existing price for a day is replaced.
    const { error } = await getSupabaseAdmin()
      .from("price_overrides")
      .upsert(rows, { onConflict: "apartment_id,date" });
    if (error) {
      logError("PUT /api/admin/prices", error);
      return jsonError(adminText.api.saveFailed, 500);
    }

    // Every page is rebuilt on its next visit, so the public site shows the new price.
    revalidatePath("/", "layout");
    return Response.json({ ok: true, days: rows.length });
  } catch (error) {
    logError("PUT /api/admin/prices", error);
    return jsonError(adminText.api.saveFailed, 500);
  }
}

/** DELETE { slug, from, to }: those days go back to the base price. */
export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const parsed = resetPricesSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const { slug, from, to } = parsed.data;

    const apartment = await getApartmentBySlug(slug);
    if (!apartment) return jsonError(adminText.api.apartmentNotFound, 404);

    // A day without a row uses the base price, so deleting the rows is all it takes.
    const { error } = await getSupabaseAdmin()
      .from("price_overrides")
      .delete()
      .eq("apartment_id", apartment.id)
      .gte("date", from)
      .lte("date", to);
    if (error) {
      logError("DELETE /api/admin/prices", error);
      return jsonError(adminText.api.saveFailed, 500);
    }

    revalidatePath("/", "layout");
    return Response.json({ ok: true, days: daysInclusive(from, to).length });
  } catch (error) {
    logError("DELETE /api/admin/prices", error);
    return jsonError(adminText.api.saveFailed, 500);
  }
}
