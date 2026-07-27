import { redirect } from "next/navigation";

export default async function PayrollReportsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/app/reports?type=PAYROLL`);
}
