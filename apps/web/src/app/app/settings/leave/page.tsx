import { redirect } from "next/navigation";

export default function LeaveSettingsPage() {
  redirect("/app/attendance/setup/leave");
}
