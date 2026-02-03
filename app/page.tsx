import { MainLayout } from '@/components/layout/main-layout';

export default function HomePage() {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
          Busca municipios y localidades de Tenerife
        </h2>
        <p className="text-muted-foreground max-w-md">
          Escribe al menos 3 caracteres en el buscador para comenzar
        </p>
      </div>
    </MainLayout>
  );
}
