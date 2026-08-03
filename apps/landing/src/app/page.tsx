import { Hero } from "@/components/hero";
import { MarketingFooter } from "@/components/marketing-footer";
import { PlatformStory } from "@/components/platform-story";
import { ScrollExperience } from "@/components/scroll-experience";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main>
      <ScrollExperience />
      <SiteHeader />
      <Hero />
      <PlatformStory />
      <MarketingFooter />
    </main>
  );
}
