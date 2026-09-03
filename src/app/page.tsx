import { redirect } from "next/navigation";
import { getSessionParent } from "@/lib/dal";

export default async function Home() {
  const session = await getSessionParent();
  if (!session) redirect("/login");
  if (!session.parent || !session.household) redirect("/onboarding");
  redirect("/dashboard");
}
