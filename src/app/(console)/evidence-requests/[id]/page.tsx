import { RequestDetailScreen } from "@/features/requests/request-detail-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RequestDetailScreen requestId={id} />;
}
