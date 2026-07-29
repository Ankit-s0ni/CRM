import { redirect } from "@/i18n/navigation";
import type { AppLanguage } from "@/i18n/routing";

export default async function LeavePoliciesPage({
  params,
}: {
  params: Promise<{ lang: AppLanguage }>;
}) {
  const { lang } = await params;
  redirect({ href: "/app/attendance/setup/leave", locale: lang });
}
