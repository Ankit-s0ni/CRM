import { Hero } from "@/components/hero";
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
      <footer>
        <span>DeltCRM</span>
        <p>One connected system for the business you are becoming.</p>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
