import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  if (!session) redirect("/signin");

  const role = (session.user as { role?: string }).role;
  if (role === "Admin") redirect("/dashboard");
  redirect("/rider");
}
