import { redirect } from "@/i18n/navigation";
import type { AppLanguage } from "@/i18n/routing";

export default async function LeaveApprovalsPage({
  params,
}: {
  params: Promise<{ lang: AppLanguage }>;
}) {
  const { lang } = await params;
  redirect({ href: "/app/attendance/leave/approvals", locale: lang });
}
