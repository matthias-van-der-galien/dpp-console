import { SupplierSubmissionScreen } from "@/features/supplier-submissions/supplier-submission-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SupplierSubmissionScreen token={token} />;
}
