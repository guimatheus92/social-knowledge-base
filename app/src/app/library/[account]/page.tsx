import { LibraryView } from "@/components/library/LibraryView";

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ account: string }>;
}) {
  const { account } = await params;
  return <LibraryView account={account} />;
}
