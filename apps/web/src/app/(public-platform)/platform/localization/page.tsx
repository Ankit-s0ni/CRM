import { PlatformLocalizationView } from "@/features/platform/localization/platform-localization-view";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformLocalizationPage() {
  return (
    <PlatformShell>
      <PlatformLocalizationView />
    </PlatformShell>
  );
}
