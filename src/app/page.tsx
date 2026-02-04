import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { FeaturesSection } from '@/components/home/features-section';
import { TenerifeBanner } from '@/components/home/tenerife-banner';
import { CTASection } from '@/components/home/cta-section';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <TenerifeBanner />
      <CTASection />
    </main>
  );
}
