import { redirect } from "next/navigation";

export default function LoginRedirectPage() {
  redirect("https://platform.blufield.cloud/signup");
}
