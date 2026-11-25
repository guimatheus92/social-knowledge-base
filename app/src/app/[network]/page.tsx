import { notFound } from "next/navigation";
import { NETWORKS } from "@/lib/networks";
import DashboardPage from "../page";

/** /instagram, /tiktok, … — the dashboard drilled into one network (it reads the param itself). */
export default async function NetworkPage({
  params,
}: {
  params: Promise<{ network: string }>;
}) {
  const { network } = await params;
  if (!NETWORKS.some((n) => n.id === network)) notFound();
  return <DashboardPage />;
}
