import { Suspense } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { MunicipalitySummaryComponent } from '@/components/search/municipality-summary';
import { MunicipalitySummarySkeleton } from '@/components/search/municipality-summary-skeleton';
import { getMunicipalitySummaryByIne } from '@/lib/queries/municipality';
import { notFound } from 'next/navigation';
import { ScrollToSummary } from '@/components/search/scroll-to-summary';
import { MunicipalityDataView } from '@/components/municipality/municipality-data-view';

interface MunicipalityPageProps {
  params: Promise<{ ine_code: string }>;
  searchParams: Promise<{ localidad?: string }>;
}

async function MunicipalityContent({ 
  ine_code, 
  selectedTownName 
}: { 
  ine_code: string;
  selectedTownName?: string;
}) {
  const data = await getMunicipalitySummaryByIne(ine_code);

  if (!data) {
    notFound();
  }

  return (
    <>
      <MunicipalitySummaryComponent data={data} selectedTownName={selectedTownName} />
      <div className="mt-8">
        <MunicipalityDataView ineCode={ine_code} selectedTownName={selectedTownName} />
      </div>
    </>
  );
}

export default async function MunicipalityPage({
  params,
  searchParams,
}: MunicipalityPageProps) {
  const { ine_code } = await params;
  const { localidad } = await searchParams;
  const selectedTownName = localidad ? decodeURIComponent(localidad) : undefined;

  return (
    <MainLayout>
      <ScrollToSummary />
      <Suspense fallback={<MunicipalitySummarySkeleton />}>
        <MunicipalityContent ine_code={ine_code} selectedTownName={selectedTownName} />
      </Suspense>
    </MainLayout>
  );
}
