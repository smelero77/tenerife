'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Wheat,
} from 'lucide-react';
import {
  AgriculturalCommerce,
  getAgriculturalCommerceByIne,
} from '@/lib/queries/agriculture';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function AgricultureCard({ commerce, showTypeBadge = true }: { commerce: AgriculturalCommerce; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = commerce.latitud && commerce.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${commerce.longitud - 0.002},${commerce.latitud - 0.002},${commerce.longitud + 0.002},${commerce.latitud + 0.002}&layer=mapnik&marker=${commerce.latitud},${commerce.longitud}&zoom=17`
    : null;

  // Clean type label - remove "agricultura" prefix and capitalize
  const cleanTypeLabel = (type: string | null): string => {
    if (!type) return '';
    return type
      .replace(/^agricultura\s*/i, '')
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {commerce.comercio_nombre}
              </h4>
            </div>
            {/* Tipo badge - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
            {showTypeBadge && commerce.comercio_tipo && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
                {cleanTypeLabel(commerce.comercio_tipo)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {commerce.comercio_direccion && (
            <button
              type="button"
              onClick={() => commerce.latitud && commerce.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                commerce.latitud && commerce.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!commerce.latitud || !commerce.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                commerce.latitud && commerce.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  commerce.latitud && commerce.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {commerce.comercio_direccion}
                </p>
                {commerce.comercio_codigo_postal && (
                  <p className="text-[#072357]/50">
                    {commerce.comercio_codigo_postal} {commerce.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(commerce.comercio_telefono || commerce.comercio_email || commerce.comercio_web) && (
            <div className="pt-3 space-y-2.5">
              {commerce.comercio_telefono && (
                <a
                  href={`tel:${commerce.comercio_telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{commerce.comercio_telefono}</span>
                </a>
              )}
              {commerce.comercio_email && (
                <a
                  href={`mailto:${commerce.comercio_email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{commerce.comercio_email}</span>
                </a>
              )}
              {commerce.comercio_web && (
                <a
                  href={commerce.comercio_web.startsWith('http') ? commerce.comercio_web : `https://${commerce.comercio_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{commerce.comercio_web}</span>
                  <ExternalLink className="w-3 h-3 text-[#072357]/40 shrink-0" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Dialog */}
      {mapUrl && (
        <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
          <DialogContent className="max-w-4xl w-full p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b border-[#072357]/10">
              <DialogTitle className="text-lg font-semibold text-[#072357]">
                {commerce.comercio_nombre}
              </DialogTitle>
            </DialogHeader>
            <div className="relative w-full aspect-video bg-[#072357]/5">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={mapUrl}
                className="w-full h-full"
                title={`Mapa de ${commerce.comercio_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {commerce.comercio_direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {commerce.comercio_direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${commerce.latitud},${commerce.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${commerce.latitud}&mlon=${commerce.longitud}&zoom=15`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  OpenStreetMap
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

interface V0AgricultureViewProps {
  ineCode: string;
  municipalityName: string;
  showSkeleton?: boolean;
  stickyOffsetTop?: number;
}

export function V0AgricultureView({ ineCode, municipalityName, stickyOffsetTop }: V0AgricultureViewProps) {
  const isSticky = stickyOffsetTop != null && stickyOffsetTop > 0;

  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');
  const [allCommerce, setAllCommerce] = useState<AgriculturalCommerce[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all commerce once
  useEffect(() => {
    setLoading(true);
    getAgriculturalCommerceByIne(ineCode)
      .then((data) => {
        setAllCommerce(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading agricultural commerce:', error);
        setLoading(false);
      });
  }, [ineCode]);

  // Get unique types from commerce dynamically
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    allCommerce.forEach((com) => {
      if (com.comercio_tipo) {
        types.add(com.comercio_tipo);
      }
    });
    return Array.from(types).sort();
  }, [allCommerce]);

  // Count by type (using all commerce)
  const countByType = useMemo(() => {
    const counts: Record<string, number> = { all: allCommerce.length };
    allCommerce.forEach((com) => {
      const type = com.comercio_tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allCommerce]);

  // Filter commerce based on active filter
  const filteredCommerce = useMemo(() => {
    if (activeFilter === 'all') {
      return allCommerce;
    }
    return allCommerce.filter((com) => com.comercio_tipo === activeFilter);
  }, [allCommerce, activeFilter]);

  // Clean type label - remove "agricultura" prefix and capitalize
  const cleanTypeLabel = (type: string): string => {
    return type
      .replace(/^agricultura\s*/i, '')
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-0">
      <div
        className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
        style={isSticky && stickyOffsetTop != null ? { position: 'sticky', top: stickyOffsetTop, zIndex: 20, backgroundColor: '#f5f8fa' } : undefined}
      >
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f7fa] to-transparent z-10 pointer-events-none sm:hidden" />
        <div
          className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading ? (
            // Tabs skeleton while loading
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  className="h-9 sm:h-10 w-24 sm:w-28 rounded-full shrink-0"
                />
              ))}
            </>
          ) : (
            <>
              {/* Tab "Todos" */}
              <button
                key="all"
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Wheat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Todos
                <span
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeFilter === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {countByType.all || 0}
                </span>
              </button>

              {/* Dynamic tabs for each unique type */}
              {uniqueTypes.map((type) => {
                const count = countByType[type] || 0;
                const isActive = activeFilter === type;
                const label = cleanTypeLabel(type);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveFilter(type)}
                    className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? 'bg-[#072357] text-white'
                        : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                    }`}
                  >
                    {label}
                    <span
                      className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#072357]/10 text-[#072357]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="relative">
      {loading ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
            >
              {/* Header skeleton */}
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                <Skeleton className="h-4 sm:h-5 w-3/4" />
              </div>
              {/* Content skeleton */}
              <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Skeleton className="w-4 h-4 rounded shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 sm:h-3.5 w-full" />
                    <Skeleton className="h-3 sm:h-3.5 w-2/3" />
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-4 h-4 rounded shrink-0" />
                  <Skeleton className="h-3 sm:h-3.5 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCommerce.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredCommerce.map((commerce) => (
            <AgricultureCard 
              key={commerce.id} 
              commerce={commerce} 
              showTypeBadge={activeFilter === 'all'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#072357]/50">
          <Wheat className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay comercios agrícolas en el municipio</p>
        </div>
      )}
      </div>
    </div>
  );
}
