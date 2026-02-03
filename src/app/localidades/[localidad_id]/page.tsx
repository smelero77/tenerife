import { MainLayout } from '@/components/layout/main-layout';
import { MunicipalitySummaryComponent } from '@/components/search/municipality-summary';
import { ScrollToSummary } from '@/components/search/scroll-to-summary';
import { getTownAndMunicipality } from '@/lib/queries/search';
import { getMunicipalitySummaryByIne } from '@/lib/queries/municipality';
import { notFound } from 'next/navigation';

interface TownPageProps {
  params: Promise<{ localidad_id: string }>;
}

export default async function TownPage({ params }: TownPageProps) {
  const { localidad_id } = await params;

  const { town, municipality } = await getTownAndMunicipality(localidad_id);

  if (!town || !municipality) {
    notFound();
  }

  const municipalityData = await getMunicipalitySummaryByIne(municipality.ine_code);

  if (!municipalityData) {
    notFound();
  }

  return (
    <MainLayout>
      <ScrollToSummary />
      <MunicipalitySummaryComponent
        data={municipalityData}
        selectedTownName={town.localidad_name}
      />
    </MainLayout>
  );
}
