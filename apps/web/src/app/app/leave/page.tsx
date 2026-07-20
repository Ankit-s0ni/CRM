import { redirect } from "next/navigation";

export default function LeavePage() {
  redirect("/app/attendance/leave/balances");
}
