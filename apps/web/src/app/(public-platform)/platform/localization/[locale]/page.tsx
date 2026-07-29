import { PlatformLocalizationEditor } from "@/features/platform/localization/platform-localization-view";
import { PlatformShell } from "@/features/platform/platform-shell";

export default async function PlatformLocalizationEditorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <PlatformShell>
      <PlatformLocalizationEditor locale={decodeURIComponent(locale)} />
    </PlatformShell>
  );
}
