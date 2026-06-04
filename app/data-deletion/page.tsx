import LegalPage from "@/components/copied-ui/pages/LegalPage";

export default function DataDeletionPage() {
  return (
    <LegalPage
      eyebrow="Account"
      title="Data Deletion Instructions"
      summary="You can remove connected social access and request deletion of your AutoPost Hub data."
      sections={[
        {
          title: "Disconnect social channels",
          paragraphs: [
            "Sign in to AutoPost Hub, open Channels, choose the connected account, and disconnect it. This stops future publishing and synchronization requests for that channel.",
          ],
        },
        {
          title: "Request workspace deletion",
          paragraphs: [
            "Send a deletion request from the email address used for your AutoPost Hub account to the support contact listed for the AutoPost Hub application in the Meta authorization dialog. Include the workspace name and the connected social account names you want removed.",
            "Deletion requests are verified before workspace records, encrypted provider tokens, scheduled posts, drafts, and stored media are removed.",
          ],
        },
        {
          title: "Meta data deletion callback",
          paragraphs: [
            "If you remove AutoPost Hub from your Meta account, Meta can notify AutoPost Hub through the platform data deletion callback. The callback disconnects matching Facebook and Instagram channels, clears stored provider tokens, removes imported Meta social data, and returns a confirmation code.",
            "Meta dashboard callback URL: https://autopost-hub.vercel.app/api/meta/data-deletion",
          ],
        },
        {
          title: "Processing time",
          paragraphs: [
            "Verified deletion requests are processed as soon as reasonably possible. Some audit records may be retained only when required for security or legal compliance.",
          ],
        },
      ]}
    />
  );
}
