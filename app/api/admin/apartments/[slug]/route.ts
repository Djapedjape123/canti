import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { adminText } from "@/lib/admin-text";
import { jsonError, logError, readJson, validationError } from "@/lib/api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { basePricesPatchSchema, slugSchema } from "@/lib/validation";

/** PATCH { price_weekday?, price_friday?, price_saturday? }: an apartment's base prices. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/apartments/[slug]">) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    // In Next.js 16 params is a Promise.
    const { slug } = await ctx.params;
    const validSlug = slugSchema.safeParse(slug);
    if (!validSlug.success) return jsonError(adminText.api.apartmentNotFound, 404);

    const parsed = basePricesPatchSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);

    // Only the prices that were sent change. select() returns the updated row,
    // so an unknown slug comes back as an empty list.
    const { data, error } = await getSupabaseAdmin()
      .from("apartments")
      .update(parsed.data)
      .eq("slug", validSlug.data)
      .select("slug, price_weekday, price_friday, price_saturday");
    if (error) {
      logError("PATCH /api/admin/apartments/[slug]", error);
      return jsonError(adminText.api.saveFailed, 500);
    }
    const apartment = data.at(0);
    if (!apartment) return jsonError(adminText.api.apartmentNotFound, 404);

    // Every page is rebuilt on its next visit, so "od X €" and the calendar use the new prices.
    revalidatePath("/", "layout");
    return Response.json({ ok: true, apartment });
  } catch (error) {
    logError("PATCH /api/admin/apartments/[slug]", error);
    return jsonError(adminText.api.saveFailed, 500);
  }
}
