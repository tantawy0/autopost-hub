import LegalPage from "@/components/copied-ui/pages/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms apply when you use AutoPost Hub to create, schedule, analyze, or publish social content."
      sections={[
        {
          title: "Authorized use",
          paragraphs: [
            "You may connect only accounts and social channels that you are authorized to manage. You remain responsible for the content you create, schedule, and publish.",
          ],
        },
        {
          title: "Platform rules",
          paragraphs: [
            "Publishing is subject to the rules, permissions, rate limits, and availability of each connected social platform. AutoPost Hub may delay or reject actions that would violate those requirements.",
          ],
        },
        {
          title: "Service availability",
          paragraphs: [
            "We work to provide reliable scheduling, retries, and clear error reporting. Third-party outages, expired permissions, and platform review restrictions may temporarily limit some features.",
          ],
        },
        {
          title: "Account security",
          paragraphs: [
            "You are responsible for protecting your sign-in credentials and for reviewing workspace membership and connected channels regularly.",
          ],
        },
      ]}
    />
  );
}
