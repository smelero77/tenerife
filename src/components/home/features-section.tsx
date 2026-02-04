'use client';

import { Users, Activity, MapPin, Info } from 'lucide-react';
import { FeatureCard } from './feature-card';

const features = [
  {
    icon: Users,
    title: 'Demografía',
    description:
      'Población, densidad, distribución por edad y evolución demográfica de cada municipio.',
    stat: '31',
    statLabel: 'Municipios',
  },
  {
    icon: Activity,
    title: 'Sanidad',
    description:
      'Hospitales, centros de salud, farmacias y servicios de emergencia en toda la isla.',
    stat: '850+',
    statLabel: 'Centros',
  },
  {
    icon: MapPin,
    title: 'Localidades',
    description:
      'Información detallada de pueblos, barrios y zonas con puntos de interés cercanos.',
    stat: '350+',
    statLabel: 'Lugares',
  },
  {
    icon: Info,
    title: 'Turismo',
    description:
      'Playas, rutas de senderismo, monumentos históricos y experiencias únicas.',
    stat: '500+',
    statLabel: 'Destinos',
  },
];

export function FeaturesSection() {
  return (
    <section className="relative px-4 py-12 sm:py-24 bg-gradient-to-b from-background to-[#f0f5fa]">
      {/* Section header */}
      <div className="text-center mb-10 sm:mb-16">
        <span className="inline-block px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[#072357] bg-[#072357]/10 rounded-full mb-4">
          Explora
        </span>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#072357] mb-3 sm:mb-4 text-balance">
          Todo lo que necesitas
        </h2>
        <p className="text-sm sm:text-base text-[#072357]/60 max-w-lg mx-auto text-pretty">
          Accede a información actualizada sobre demografía, servicios, lugares
          y turismo de Tenerife
        </p>
      </div>

      {/* Cards grid - 2 columns on mobile for app-like feel */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto">
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            stat={feature.stat}
            statLabel={feature.statLabel}
          />
        ))}
      </div>
    </section>
  );
}
