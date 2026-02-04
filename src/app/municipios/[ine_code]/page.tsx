import { Suspense } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { MunicipalitySummarySkeleton } from '@/components/search/municipality-summary-skeleton';
import { getMunicipalitySummaryByIne } from '@/lib/queries/municipality';
import { notFound } from 'next/navigation';
import { V0MunicipalityPage } from '@/components/municipality/v0-municipality-page';

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
    <V0MunicipalityPage
      data={data}
      selectedTownName={selectedTownName}
      ineCode={ine_code}
    />
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
      <Suspense fallback={<MunicipalitySummarySkeleton />}>
        <MunicipalityContent ine_code={ine_code} selectedTownName={selectedTownName} />
      </Suspense>
    </MainLayout>
  );
}
