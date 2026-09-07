import { redirect } from "next/navigation";
import { PLATFORM_SIGNUP_URL } from "@/lib/config";

export default function LoginRedirectPage() {
  redirect(PLATFORM_SIGNUP_URL);
}
