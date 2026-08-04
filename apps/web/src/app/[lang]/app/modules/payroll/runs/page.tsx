import { redirect } from "next/navigation";

export default async function PayrollRunsRedirectPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/app/payroll/runs`);
}
