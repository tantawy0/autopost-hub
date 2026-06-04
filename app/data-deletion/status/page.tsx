import LegalPage from "@/components/copied-ui/pages/LegalPage";
import { getMetaDataDeletionStatus } from "@/lib/server/meta-data-deletion";
import { createServerSupabaseClient } from "@/lib/supabase-server";

interface DataDeletionStatusPageProps {
  searchParams?: Promise<{ code?: string }>;
}

function labelForStatus(status: string) {
  if (status === "processed") return "Processed";
  if (status === "no_match") return "Received; no matching connected Meta data was found";
  if (status === "failed") return "Failed";

  return "Received";
}

export default async function DataDeletionStatusPage({ searchParams }: DataDeletionStatusPageProps) {
  const params = await searchParams;
  const code = typeof params?.code === "string" ? params.code : "";
  const request = code ? await getMetaDataDeletionStatus(createServerSupabaseClient(), code) : null;

  return (
    <LegalPage
      eyebrow="Account"
      title="Data Deletion Status"
      summary={
        request
          ? `Confirmation ${request.confirmation_code}: ${labelForStatus(request.status)}.`
          : "Enter a valid confirmation code from your Meta data deletion request."
      }
      sections={[
        {
          title: "Request status",
          paragraphs: request
            ? [
                `Provider: ${request.provider}.`,
                `Status: ${labelForStatus(request.status)}.`,
                `Requested: ${new Date(request.requested_at).toISOString()}.`,
                request.processed_at
                  ? `Processed: ${new Date(request.processed_at).toISOString()}.`
                  : "Processing has not completed yet.",
              ]
            : [
                "No matching deletion request was found for this confirmation code. Check the code and try again, or use the Data Deletion page to contact support.",
              ],
        },
      ]}
    />
  );
}
