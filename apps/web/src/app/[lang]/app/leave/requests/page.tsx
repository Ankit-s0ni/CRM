import { redirect } from "@/i18n/navigation";
import type { AppLanguage } from "@/i18n/routing";

export default async function LeaveRequestsPage({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ lang: AppLanguage }>;
}) {
  const { lang } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
    else value?.forEach((item) => query.append(key, item));
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  redirect({
    href: `/app/attendance/leave/requests${suffix}`,
    locale: lang,
  });
}
