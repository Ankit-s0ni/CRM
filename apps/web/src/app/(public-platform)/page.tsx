import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformAdminHostname } from "@/lib/app-domain";

export default async function Home() {
  const requestHeaders = await headers();
  const hostname =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";

  if (isPlatformAdminHostname(hostname)) {
    redirect("/platform");
  }

  redirect("/login");
}
