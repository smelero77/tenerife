'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Shield,
} from 'lucide-react';
import {
  PublicAdministration,
  getPublicAdministrationsByIne,
} from '@/lib/queries/administration';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function AdministrationCard({ administration }: { administration: PublicAdministration }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = administration.latitud && administration.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${administration.longitud - 0.002},${administration.latitud - 0.002},${administration.longitud + 0.002},${administration.latitud + 0.002}&layer=mapnik&marker=${administration.latitud},${administration.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {administration.nombre}
              </h4>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {administration.direccion && (
            <button
              type="button"
              onClick={() => administration.latitud && administration.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                administration.latitud && administration.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!administration.latitud || !administration.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                administration.latitud && administration.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  administration.latitud && administration.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {administration.direccion}
                </p>
                {administration.codigo_postal && (
                  <p className="text-[#072357]/50">
                    {administration.codigo_postal} {administration.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(administration.telefono || administration.email || administration.web) && (
            <div className="pt-3 space-y-2.5">
              {administration.telefono && (
                <a
                  href={`tel:${administration.telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{administration.telefono}</span>
                </a>
              )}
              {administration.email && (
                <a
                  href={`mailto:${administration.email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{administration.email}</span>
                </a>
              )}
              {administration.web && (
                <a
                  href={administration.web.startsWith('http') ? administration.web : `https://${administration.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{administration.web}</span>
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
                {administration.nombre}
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
                title={`Mapa de ${administration.nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {administration.direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {administration.direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${administration.latitud},${administration.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${administration.latitud}&mlon=${administration.longitud}&zoom=15`}
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

interface V0AdministrationViewProps {
  ineCode: string;
  municipalityName: string;
  showSkeleton?: boolean;
}

export function V0AdministrationView({ ineCode, municipalityName }: V0AdministrationViewProps) {
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');
  const [allAdministrations, setAllAdministrations] = useState<PublicAdministration[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all administrations once
  useEffect(() => {
    setLoading(true);
    getPublicAdministrationsByIne(ineCode)
      .then((data) => {
        setAllAdministrations(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading public administrations:', error);
        setLoading(false);
      });
  }, [ineCode]);

  // Get unique types from administrations dynamically
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    allAdministrations.forEach((admin) => {
      if (admin.tipo) {
        types.add(admin.tipo);
      }
    });
    return Array.from(types).sort();
  }, [allAdministrations]);

  // Count by type (using all administrations)
  const countByType = useMemo(() => {
    const counts: Record<string, number> = { all: allAdministrations.length };
    allAdministrations.forEach((admin) => {
      const type = admin.tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allAdministrations]);

  // Filter administrations based on active filter
  const filteredAdministrations = useMemo(() => {
    if (activeFilter === 'all') {
      return allAdministrations;
    }
    return allAdministrations.filter((admin) => admin.tipo === activeFilter);
  }, [allAdministrations, activeFilter]);

  return (
    <div className="space-y-4">
      {/* Dynamic tabs based on unique types */}
      <div className="relative -mx-4 sm:-mx-6">
        {/* Fade indicator on right to show more content */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f7fa] to-transparent z-10 pointer-events-none sm:hidden" />

        <div
          className="flex gap-2 overflow-x-auto pb-1 px-4 sm:px-6 scrollbar-hide"
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
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                // Remove "administracion publica" and "servicios", then capitalize first letter
                let cleanedType = type
                  .replace(/administracion\s+publica\s*/gi, '')
                  .replace(/servicios\s*/gi, '')
                  .trim();
                const label = cleanedType.charAt(0).toUpperCase() + cleanedType.slice(1).toLowerCase();

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

      {/* Administration cards grid */}
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
      ) : filteredAdministrations.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredAdministrations.map((administration) => (
            <AdministrationCard key={administration.id} administration={administration} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#072357]/50">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay administraciones públicas de este tipo en el municipio</p>
        </div>
      )}
    </div>
  );
}
