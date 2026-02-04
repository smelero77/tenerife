'use client';

import * as React from 'react';
import { useState } from 'react';
import { Compass } from 'lucide-react';
import { V0Search } from '@/components/home/v0-search';
import { MunicipalityDetailSheet } from '@/components/municipality/municipality-detail-sheet';
import { cn } from '@/lib/utils';

const row1Tags = [
  'Demografía',
  'Hospitales',
  'Turismo',
  'Playas',
  'Transporte',
  'Educación',
  'Comercio',
  'Cultura',
];

const row2Tags = [
  'Municipios',
  'Sanidad',
  'Ocio',
  'Deportes',
  'Naturaleza',
  'Gastronomía',
  'Historia',
  'Servicios',
];

function MarqueeRow({
  tags,
  direction = 'left',
}: {
  tags: string[];
  direction?: 'left' | 'right';
}) {
  const duplicatedTags = [...tags, ...tags, ...tags];

  return (
    <div className="relative flex overflow-hidden">
      <div
        className={cn(
          'flex gap-3',
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'
        )}
      >
        {duplicatedTags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="shrink-0 px-4 py-2 text-sm bg-white/10 backdrop-blur-sm text-white/80 rounded-full border border-white/20 whitespace-nowrap"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HeroSection() {
  const [selectedIneCode, setSelectedIneCode] = useState<string | null>(null);
  const [selectedTownName, setSelectedTownName] = useState<string | undefined>();

  const handleSelectMunicipality = (ineCode: string, townName?: string) => {
    setSelectedIneCode(ineCode);
    setSelectedTownName(townName);
  };

  const handleCloseSheet = () => {
    setSelectedIneCode(null);
    setSelectedTownName(undefined);
  };

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-gradient-to-b from-[#072357] via-[#004080] to-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/3 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0066cc]/20 rounded-full blur-3xl" />
      </div>

      {/* Logo/Brand */}
      <div className="relative z-10 mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Compass className="w-7 h-7 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight text-white">
          Tenerife Data
        </span>
      </div>

      {/* Main Title */}
      <div className="relative z-10 text-center mb-10 space-y-4">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white text-balance">
          Explora
          <span className="block text-white/90">Tenerife</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/70 max-w-md mx-auto text-pretty">
          Descubre datos, servicios y lugares de la isla en tiempo real
        </p>
      </div>

      {/* Search Bar - Using new V0 search design */}
      <div className="relative z-20 w-full max-w-lg px-4 mb-8">
        <V0Search onSelectMunicipality={handleSelectMunicipality} />
      </div>

      {/* Municipality Detail Sheet */}
      <MunicipalityDetailSheet
        ineCode={selectedIneCode}
        selectedTownName={selectedTownName}
        isOpen={selectedIneCode !== null}
        onClose={handleCloseSheet}
      />

      {/* Infinite scrolling marquee */}
      <div
        className="relative z-10 w-full max-w-2xl space-y-3"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        }}
      >
        <MarqueeRow tags={row1Tags} direction="left" />
        <MarqueeRow tags={row2Tags} direction="right" />
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-white rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
