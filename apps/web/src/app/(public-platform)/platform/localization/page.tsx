import { PlatformLocalizationRegistry } from "@/features/platform/localization/platform-localization-registry";
import { PlatformShell } from "@/features/platform/platform-shell";

export default function PlatformLocalizationPage() {
  return (
    <PlatformShell>
      <PlatformLocalizationRegistry />
    </PlatformShell>
  );
}
