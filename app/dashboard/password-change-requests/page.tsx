import { redirect } from "next/navigation";

/** The legacy password approval queue was removed because it exposed passwords. */
export default function DashboardPasswordChangeRequestsPage() {
  redirect("/dashboard");
}
