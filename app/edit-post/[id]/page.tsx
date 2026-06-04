import AppShell from "@/components/app-shell/AppShell";
import Create from "@/components/copied-ui/pages/Create";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <Create postId={id} />
    </AppShell>
  );
}
