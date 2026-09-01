import { redirect } from "next/navigation";

type TmsEntryPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TmsEntryPage({ params, searchParams }: TmsEntryPageProps) {
  const { lang } = await params;
  const query = await searchParams;
  const origin = process.env.NEXT_PUBLIC_TMS_WEB_ORIGIN || "http://localhost:4032";
  const destination = new URL(`/${lang}/app/tms`, origin);

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => destination.searchParams.append(key, item));
    else if (value !== undefined) destination.searchParams.set(key, value);
  }

  redirect(destination.toString());
}
