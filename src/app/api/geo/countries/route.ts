import { COUNTRIES, DEFAULT_COUNTRY_ISO3 } from "@/lib/geo/countries";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ countries: COUNTRIES, defaultCountry: DEFAULT_COUNTRY_ISO3 });
}
