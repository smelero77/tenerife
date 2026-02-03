import { MainLayout } from '@/components/layout/main-layout';
import { MunicipalitySummarySkeleton } from '@/components/search/municipality-summary-skeleton';

export default function MunicipalityLoading() {
  return (
    <MainLayout>
      <MunicipalitySummarySkeleton />
    </MainLayout>
  );
}
