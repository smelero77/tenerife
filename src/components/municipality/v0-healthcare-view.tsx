'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Heart,
  Stethoscope,
  Pill,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  HealthService,
  HealthServiceCategory,
  getHealthServicesByIne,
} from '@/lib/queries/health';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function getTypeIcon(type: string | null): React.ElementType {
  if (!type) return Heart;
  const lowerType = type.toLowerCase();
  if (lowerType.includes('hospital')) return Building2;
  if (lowerType.includes('centro salud') || lowerType.includes('centro de salud')) return Heart;
  if (lowerType.includes('consultorio') || lowerType.includes('atención primaria')) return Stethoscope;
  if (lowerType.includes('farmacia')) return Pill;
  return Heart;
}

function getTypeLabel(type: string | null): string {
  if (!type) return 'Desconocido';
  // Capitalize first letter
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function getTypeColor(type: string | null): string {
  if (!type) return '#666';
  if (type.includes('hospital')) return '#cc3366';
  if (type.includes('centro salud')) return '#0066cc';
  if (type.includes('consultorio') || type.includes('atención primaria'))
    return '#00994d';
  if (type.includes('farmacia')) return '#9933cc';
  return '#666';
}

function HealthcareCard({ service }: { service: HealthService }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = service.latitud && service.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${service.longitud - 0.002},${service.latitud - 0.002},${service.longitud + 0.002},${service.latitud + 0.002}&layer=mapnik&marker=${service.latitud},${service.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {service.nombre}
              </h4>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {service.direccion && (
            <button
              type="button"
              onClick={() => service.latitud && service.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                service.latitud && service.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!service.latitud || !service.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                service.latitud && service.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  service.latitud && service.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {service.direccion}
                </p>
                {service.codigo_postal && (
                  <p className="text-[#072357]/50">
                    {service.codigo_postal} {service.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(service.telefono || service.email || service.web) && (
            <div className="pt-3 space-y-2.5">
              {service.telefono && (
                <a
                  href={`tel:${service.telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{service.telefono}</span>
                </a>
              )}
              {service.email && (
                <a
                  href={`mailto:${service.email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{service.email}</span>
                </a>
              )}
              {service.web && (
                <a
                  href={service.web.startsWith('http') ? service.web : `https://${service.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{service.web}</span>
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
                {service.nombre}
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
                title={`Mapa de ${service.nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {service.direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {service.direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${service.latitud},${service.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${service.latitud}&mlon=${service.longitud}&zoom=15`}
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

interface V0HealthcareViewProps {
  ineCode: string;
  municipalityName: string;
  showSkeleton?: boolean;
}

export function V0HealthcareView({ ineCode, municipalityName }: V0HealthcareViewProps) {
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');
  const [allServices, setAllServices] = useState<HealthService[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all services once
  useEffect(() => {
    setLoading(true);
    getHealthServicesByIne(ineCode)
      .then((data) => {
        setAllServices(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading health services:', error);
        setLoading(false);
      });
  }, [ineCode]);

  // Get unique types from services dynamically
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    allServices.forEach((service) => {
      if (service.tipo) {
        types.add(service.tipo);
      }
    });
    return Array.from(types).sort();
  }, [allServices]);

  // Count by type (using all services)
  const countByType = useMemo(() => {
    const counts: Record<string, number> = { all: allServices.length };
    allServices.forEach((service) => {
      const type = service.tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allServices]);

  // Filter services based on active filter
  const filteredServices = useMemo(() => {
    if (activeFilter === 'all') {
      return allServices;
    }
    return allServices.filter((service) => service.tipo === activeFilter);
  }, [allServices, activeFilter]);

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
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    {getTypeLabel(type)}
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

      {/* Healthcare cards grid */}
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
              {/* Actions skeleton */}
              <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-[#f8fafc] border-t border-[#072357]/5">
                <Skeleton className="h-3.5 sm:h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredServices.map((service) => (
            <HealthcareCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#072357]/50">
          <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay centros de este tipo en el municipio</p>
        </div>
      )}
    </div>
  );
}
