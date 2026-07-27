import { redirect } from "next/navigation";

export default async function AttendanceReportsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/app/reports`);
}
