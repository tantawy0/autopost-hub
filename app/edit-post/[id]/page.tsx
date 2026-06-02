import AppShell from "@/components/app-shell/AppShell";
import PostComposerForm from "@/components/posts/PostComposerForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <PostComposerForm postId={id} />
    </AppShell>
  );
}
