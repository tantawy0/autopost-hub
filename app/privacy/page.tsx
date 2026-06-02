import LegalPage from "@/components/copied-ui/pages/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      summary="AutoPost Hub helps creators plan, schedule, and publish social content. This policy explains the data used to provide that service."
      sections={[
        {
          title: "Information we process",
          paragraphs: [
            "We process account details, workspace settings, drafts, scheduled posts, uploaded media, connected channel metadata, encrypted provider tokens, publishing history, and analytics returned by connected platforms.",
            "We use this information only to operate the product, publish content you authorize, improve reliability, and show your workspace activity.",
          ],
        },
        {
          title: "Connected social platforms",
          paragraphs: [
            "When you connect a platform such as Facebook or Instagram, AutoPost Hub stores access tokens securely on the server and uses them only for actions you request, scheduled publishing, and authorized synchronization.",
            "You can disconnect a connected channel from the product. Disconnecting stops future platform requests for that channel.",
          ],
        },
        {
          title: "Storage and security",
          paragraphs: [
            "Uploaded media is stored in workspace-scoped paths. Sensitive credentials are server-side only. Access controls, audit logs, and retry-safe background processing are used to protect workspace data.",
          ],
        },
        {
          title: "Deletion requests",
          paragraphs: [
            "You may request deletion of your AutoPost Hub data at any time. Follow the instructions on the Data Deletion page. Data required for security, fraud prevention, or legal compliance may be retained only when necessary.",
          ],
        },
      ]}
    />
  );
}
