'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Users,
  GraduationCap,
  Heart,
  Palette,
  Camera,
  ShoppingBag,
  Wheat,
  Star,
  Circle,
  MapPin,
  Building,
  Phone,
  Mail,
  Globe,
  Shield,
  Activity,
} from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import type { MunicipalitySummary } from '@/lib/queries/municipality';
import type { DemographicsData } from '@/lib/queries/demographics';
import type { PopulationStats } from '@/lib/queries/demographics';
import { getDemographicsByIne, getPopulationEvolution } from '@/lib/queries/demographics';
import { PopulationEvolutionDashboard } from '@/components/demographics/population-evolution-dashboard';
import { formatNumber } from '@/lib/utils';
import { V0HealthcareView } from './v0-healthcare-view';
import { V0EducationView } from './v0-education-view';
import { V0AdministrationView } from './v0-administration-view';
import { V0TourismView } from './v0-tourism-view';
import { V0CultureView } from './v0-culture-view';
import { V0SportsView } from './v0-sports-view';
import { Skeleton } from '@/components/ui/skeleton';

function getTabs(stats: MunicipalitySummary['statistics']) {
  return [
    { id: 'ayuntamiento', label: 'Ayuntamiento', icon: Building, count: null },
    { id: 'demografia', label: 'Demografía', icon: Users, count: null },
    {
      id: 'educacion',
      label: 'Educación',
      icon: GraduationCap,
      count: stats.centros_educativos_culturales,
    },
    {
      id: 'sanidad',
      label: 'Sanidad',
      icon: Heart,
      count: stats.centros_medicos_farmacias,
    },
    {
      id: 'administracion',
      label: 'Administración',
      icon: Shield,
      count: stats.administraciones_publicas,
    },
    {
      id: 'cultura',
      label: 'Cultura',
      icon: Palette,
      count: (stats.centros_culturales || 0) + (stats.bienes_interes_cultural || 0),
    },
    {
      id: 'deportes',
      label: 'Deportes',
      icon: Activity,
      count: (stats.centros_deportivos_ocio || 0) + (stats.instalaciones_deportivas || 0),
    },
    { 
      id: 'turismo', 
      label: 'Turismo', 
      icon: Camera, 
      count: (stats.alojamientos_agencias_viajes || 0) + 
             (stats.establecimientos_hosteleria || 0) + 
             (stats.oficinas_turismo || 0) 
    },
    {
      id: 'comercios',
      label: 'Comercios',
      icon: ShoppingBag,
      count:
        stats.comercios_alimentacion +
        stats.locales_comerciales +
        stats.comercios_agricultura,
    },
    { id: 'agricultura', label: 'Agricultura', icon: Wheat, count: null },
  ];
}

interface DemographicsViewProps {
  municipality: MunicipalitySummary;
  ineCode: string;
  selectedTownName?: string;
  populationEvolution: PopulationStats | null;
}

function DataRow({
  icon: Icon,
  name,
  total,
  genderSplit,
  nationalitySplit,
  ageSplit,
  isMain = false,
}: {
  icon?: React.ElementType;
  name: string;
  total: number;
  genderSplit: string;
  nationalitySplit: string;
  ageSplit: string;
  isMain?: boolean;
}) {
  return (
    <div
      className={`px-3 sm:px-4 py-2.5 sm:py-3 ${
        isMain
          ? 'bg-[#072357]/5'
          : 'border-b border-[#072357]/5 last:border-b-0'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        {Icon && (
          <Icon
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              isMain ? 'text-[#072357]' : 'text-[#cc9900]'
            }`}
          />
        )}
        <span
          className={`text-xs sm:text-sm ${
            isMain
              ? 'font-semibold text-[#072357]'
              : 'text-[#072357]/70'
          }`}
        >
          {name}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 sm:gap-2 text-[10px] sm:text-xs font-medium text-[#072357]">
        <div>{formatNumber(total)}</div>
        <div className="text-center">{genderSplit}</div>
        <div className="text-center">{nationalitySplit}</div>
        <div className="text-center">{ageSplit}</div>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

// Hook to get direct image URL from Wikimedia
function useDirectImageUrl(url: string | null): string | null {
  const [directUrl, setDirectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!url) {
      setDirectUrl(null);
      return;
    }

    // If already a direct image URL, use it
    if (url.startsWith('https://upload.wikimedia.org') || url.startsWith('http://upload.wikimedia.org')) {
      setDirectUrl(url);
      return;
    }

    // If it's a Special:FilePath URL, try to extract and fetch direct URL
    if (url.includes('Special:FilePath')) {
      const match = url.match(/Special:FilePath\/(.+?)(?:\?|$)/);
      if (match) {
        const filename = decodeURIComponent(match[1]);
        const fileTitle = filename.startsWith('File:') ? filename : `File:${filename}`;
        const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        
        fetch(apiUrl)
          .then(res => res.json())
          .then(data => {
            const pages = data.query?.pages;
            if (pages) {
              const pageId = Object.keys(pages)[0];
              const page = pages[pageId];
              if (page.missing === undefined && page.imageinfo) {
                const imageInfo = page.imageinfo?.[0];
                if (imageInfo?.url && imageInfo.url.startsWith('http')) {
                  setDirectUrl(imageInfo.url);
                  return;
                }
              }
            }
            setDirectUrl(url); // Fallback to original URL
          })
          .catch(() => {
            setDirectUrl(url); // Fallback to original URL
          });
      } else {
        setDirectUrl(url);
      }
    } else {
      // Try to construct direct URL
      let filename = url;
      if (filename.startsWith('File:')) {
        filename = filename.substring(5);
      }
      const directUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;
      setDirectUrl(directUrl);
    }
  }, [url]);

  return directUrl;
}

export function DemographicsView({
  municipality,
  ineCode,
  selectedTownName,
  populationEvolution: initialPopulationEvolution,
}: DemographicsViewProps) {
  const [activeTab, setActiveTab] = useState('ayuntamiento');
  const municipalityImageUrl = useDirectImageUrl(municipality.wikimedia?.image_url || null);
  const [demographicsData, setDemographicsData] =
    useState<DemographicsData | null>(null);
  const [populationEvolution, setPopulationEvolution] =
    useState<PopulationStats | null>(initialPopulationEvolution);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const tabs = getTabs(municipality.statistics);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load demographics and population evolution data when tab is demografia
  useEffect(() => {
    if (activeTab === 'demografia') {
      setLoading(true);
      Promise.all([
        getDemographicsByIne(ineCode),
        getPopulationEvolution(ineCode, selectedTownName),
      ])
        .then(([demographics, evolution]) => {
          setDemographicsData(demographics);
          setPopulationEvolution(evolution);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error loading demographics:', error);
          setLoading(false);
        });
    }
  }, [activeTab, ineCode, selectedTownName]);

  // Resetear a página 1 si cambia la localidad seleccionada
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTownName]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Horizontal scrollable tabs with fade indicator */}
      <div className="relative -mx-5">
        {/* Fade indicator on right to show more content */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
        
        <div 
          className="flex gap-2 overflow-x-auto pb-1 px-5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-[#072357] text-white"
                    : "bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
                {tab.count !== null && (
                  <span 
                    className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-[#072357]/10 text-[#072357]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'demografia' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Stats highlights and chart */}
          {loading ? (
            <>
              {/* Stats highlights skeleton - matches grid-cols-3 */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#072357]/5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      {/* Matches text-[10px] sm:text-xs */}
                      <Skeleton className="h-3 sm:h-3.5 w-20 mb-2" />
                      {/* Matches text-base sm:text-xl md:text-2xl font-bold */}
                      <Skeleton className="h-6 sm:h-7 md:h-8 w-24 mb-1" />
                      {/* Matches text-[10px] sm:text-xs */}
                      <Skeleton className="h-3 sm:h-3.5 w-16" />
                    </div>
                    {/* Trend icon placeholder */}
                    <Skeleton className="w-5 h-5 sm:w-6 sm:h-6 rounded shrink-0" />
                  </div>
                ))}
              </div>

              {/* Chart skeleton - matches chart container */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#072357]/5">
                {/* Matches text-xs sm:text-sm font-semibold */}
                <Skeleton className="h-4 sm:h-5 w-56 mb-3 sm:mb-4" />
                {/* Matches h-36 sm:h-48 */}
                <Skeleton className="h-36 sm:h-48 w-full rounded" />
              </div>

              {/* Table skeleton - matches table structure */}
              <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-[#072357]/5">
                {/* Header */}
                <div className="px-3 sm:px-4 py-2 sm:py-3 bg-[#f8fafc] border-b border-[#072357]/10">
                  <div className="grid grid-cols-4 gap-1 sm:gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton
                        key={i}
                        className="h-3 sm:h-3.5 w-16 sm:w-20"
                      />
                    ))}
                  </div>
                </div>
                {/* Municipality row skeleton */}
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[#072357]/5">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <Skeleton className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full" />
                    <Skeleton className="h-3.5 sm:h-4 w-32 sm:w-40" />
                  </div>
                  <div className="grid grid-cols-4 gap-1 sm:gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton
                        key={j}
                        className="h-3 sm:h-3.5 w-12 sm:w-16"
                      />
                    ))}
                  </div>
                </div>
                {/* Localities rows skeleton - 10 items to match ITEMS_PER_PAGE */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div
                    key={i}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[#072357]/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                      <Skeleton className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full" />
                      <Skeleton className="h-3.5 sm:h-4 w-32 sm:w-40" />
                    </div>
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton
                          key={j}
                          className="h-3 sm:h-3.5 w-12 sm:w-16"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : populationEvolution ? (
            <PopulationEvolutionDashboard data={populationEvolution} />
          ) : null}

          {/* Data table */}
          {loading ? null : demographicsData ? (
            <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-[#072357]/5">
              {/* Single header for all */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-[#f8fafc] border-b border-[#072357]/10">
                <div className="grid grid-cols-4 gap-1 sm:gap-2 text-[10px] sm:text-xs text-[#072357]/60 font-medium uppercase tracking-wider">
                  <div>Total</div>
                  <div className="text-center">Muj/Hom</div>
                  <div className="text-center">Esp/Ext</div>
                  <div className="text-center">0-14/15-64/+65</div>
                </div>
              </div>

              {/* Municipality row */}
              <DataRow
                icon={Star}
                name={demographicsData.municipality.name}
                total={demographicsData.municipality.total}
                genderSplit={`${formatNumber(demographicsData.municipality.mujeres)}/${formatNumber(demographicsData.municipality.hombres)}`}
                nationalitySplit={`${formatNumber(demographicsData.municipality.espanoles)}/${formatNumber(demographicsData.municipality.extranjeros)}`}
                ageSplit={`${formatNumber(demographicsData.municipality.age_0_14)}/${formatNumber(demographicsData.municipality.age_15_64)}/${formatNumber(demographicsData.municipality.age_65_plus)}`}
                isMain
              />

              {/* Localities - Ordenar igual que la tabla original */}
              {(() => {
                // Ordenar localidades: primero la buscada (si existe), luego alfabético, y las que empiezan por * al final
                const sortedLocalities = [...demographicsData.localities].sort((a, b) => {
                  if (selectedTownName) {
                    if (a.name === selectedTownName) return -1;
                    if (b.name === selectedTownName) return 1;
                  }
                  
                  // Verificar si empiezan por *
                  const aStartsWithStar = a.name.trim().startsWith('*');
                  const bStartsWithStar = b.name.trim().startsWith('*');
                  
                  // Si una empieza por * y la otra no, la que empieza por * va al final
                  if (aStartsWithStar && !bStartsWithStar) return 1;
                  if (!aStartsWithStar && bStartsWithStar) return -1;
                  
                  // Si ambas empiezan por * o ninguna, ordenar alfabéticamente
                  return a.name.localeCompare(b.name, 'es');
                });

                // Calcular paginación
                const totalPages = Math.ceil(sortedLocalities.length / ITEMS_PER_PAGE);
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const paginatedLocalities = sortedLocalities.slice(startIndex, endIndex);

                return (
                  <>
                    {paginatedLocalities.map((locality) => {
                      const isSelected = selectedTownName && locality.name === selectedTownName;
                      return (
                        <DataRow
                          key={locality.localidad_id}
                          icon={isSelected ? MapPin : undefined}
                          name={locality.name}
                          total={locality.total}
                          genderSplit={`${formatNumber(locality.mujeres)}/${formatNumber(locality.hombres)}`}
                          nationalitySplit={`${formatNumber(locality.espanoles)}/${formatNumber(locality.extranjeros)}`}
                          ageSplit={`${formatNumber(locality.age_0_14)}/${formatNumber(locality.age_15_64)}/${formatNumber(locality.age_65_plus)}`}
                          isMain={false}
                        />
                      );
                    })}

                    {/* Paginación */}
                    {sortedLocalities.length > ITEMS_PER_PAGE && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            
                            {/* Números de página */}
                            {(() => {
                              const pages: (number | 'ellipsis')[] = [];
                              // En móviles mostrar menos páginas (máximo 5), en desktop más (máximo 7)
                              const maxVisiblePages = isMobile ? 5 : 7;
                              
                              if (totalPages <= maxVisiblePages) {
                                // Si hay pocas páginas, mostrar todas
                                for (let i = 1; i <= totalPages; i++) {
                                  pages.push(i);
                                }
                              } else {
                                // Siempre mostrar primera página
                                pages.push(1);
                                
                                if (currentPage <= 2) {
                                  // Cerca del inicio: 1, 2, 3, ..., última
                                  for (let i = 2; i <= 3; i++) {
                                    pages.push(i);
                                  }
                                  pages.push('ellipsis');
                                  pages.push(totalPages);
                                } else if (currentPage >= totalPages - 1) {
                                  // Cerca del final: 1, ..., penúltima-1, penúltima, última
                                  pages.push('ellipsis');
                                  for (let i = totalPages - 2; i <= totalPages; i++) {
                                    pages.push(i);
                                  }
                                } else {
                                  // En el medio: 1, ..., actual-1, actual, actual+1, ..., última
                                  pages.push('ellipsis');
                                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                    pages.push(i);
                                  }
                                  pages.push('ellipsis');
                                  pages.push(totalPages);
                                }
                              }
                              
                              return pages.map((page, idx) => {
                                if (page === 'ellipsis') {
                                  return (
                                    <PaginationItem key={`ellipsis-${idx}`}>
                                      <PaginationEllipsis />
                                    </PaginationItem>
                                  );
                                }
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      isActive={currentPage === page}
                                      onClick={() => setCurrentPage(page)}
                                      className="cursor-pointer"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              });
                            })()}
                            
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 border border-[#072357]/5 text-center">
              <p className="text-sm text-[#072357]/50">
                No hay datos demográficos disponibles
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ayuntamiento' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Municipality Image */}
          {municipalityImageUrl && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#072357]/5">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#072357]/5">
                <img
                  src={municipalityImageUrl}
                  alt={`Imagen de ${municipality.basic.municipio_name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Contact actions */}
          {(municipality.wikimedia?.phone_number ||
            municipality.wikimedia?.email ||
            municipality.wikimedia?.official_website) && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#072357]/5">
              <h3 className="text-sm font-semibold text-[#072357]/70 uppercase tracking-wider mb-4">
                Contacto
              </h3>
              <div className="flex items-center gap-4">
                {municipality.wikimedia.phone_number && (
                  <a
                    href={`tel:${municipality.wikimedia.phone_number}`}
                    className="flex flex-col items-center gap-2 hover:opacity-80 active:opacity-70 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#072357]/10 flex items-center justify-center hover:bg-[#072357]/20 active:bg-[#072357]/30 transition-colors">
                      <Phone className="w-5 h-5 text-[#072357]" />
                    </div>
                    <span className="text-xs font-medium text-[#072357]">
                      Llamar
                    </span>
                  </a>
                )}
                {municipality.wikimedia.email && (
                  <a
                    href={`mailto:${municipality.wikimedia.email}`}
                    className="flex flex-col items-center gap-2 hover:opacity-80 active:opacity-70 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#072357]/10 flex items-center justify-center hover:bg-[#072357]/20 active:bg-[#072357]/30 transition-colors">
                      <Mail className="w-5 h-5 text-[#072357]" />
                    </div>
                    <span className="text-xs font-medium text-[#072357]">
                      Email
                    </span>
                  </a>
                )}
                {municipality.wikimedia.official_website && (
                  <a
                    href={municipality.wikimedia.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 hover:opacity-80 active:opacity-70 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#072357]/10 flex items-center justify-center hover:bg-[#072357]/20 active:bg-[#072357]/30 transition-colors">
                      <Globe className="w-5 h-5 text-[#072357]" />
                    </div>
                    <span className="text-xs font-medium text-[#072357]">
                      Web
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Map */}
          {municipality.wikimedia?.coordinates_lat && municipality.wikimedia?.coordinates_lon && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#072357]/5">
              <h3 className="text-sm font-semibold text-[#072357]/70 uppercase tracking-wider mb-4">
                Ubicación
              </h3>
              <div className="relative bg-white rounded-2xl overflow-hidden border border-[#072357]/5">
                <iframe
                  width="100%"
                  height="300"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${municipality.wikimedia.coordinates_lon - 0.01},${municipality.wikimedia.coordinates_lat - 0.01},${municipality.wikimedia.coordinates_lon + 0.01},${municipality.wikimedia.coordinates_lat + 0.01}&layer=mapnik&marker=${municipality.wikimedia.coordinates_lat},${municipality.wikimedia.coordinates_lon}`}
                  className="w-full"
                  title={`Mapa de ${municipality.basic.municipio_name}`}
                />
                <div className="px-4 py-2.5 bg-[#f8fafc] border-t border-[#072357]/5 flex gap-3 justify-end">
                  <a
                    href={`https://www.google.com/maps?q=${municipality.wikimedia.coordinates_lat},${municipality.wikimedia.coordinates_lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#0066cc] hover:underline"
                  >
                    Google Maps
                  </a>
                  <span className="text-xs text-[#072357]/30">|</span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${municipality.wikimedia.coordinates_lat}&mlon=${municipality.wikimedia.coordinates_lon}&zoom=15`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#0066cc] hover:underline"
                  >
                    OpenStreetMap
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sanidad' && (
        <V0HealthcareView 
          ineCode={ineCode} 
          municipalityName={municipality.basic.municipio_name}
          showSkeleton={false}
        />
      )}

      {activeTab === 'educacion' && (
        <V0EducationView 
          ineCode={ineCode} 
          municipalityName={municipality.basic.municipio_name}
        />
      )}

      {activeTab === 'administracion' && (
        <V0AdministrationView 
          ineCode={ineCode} 
          municipalityName={municipality.basic.municipio_name}
          showSkeleton={false}
        />
      )}

      {activeTab === 'turismo' && (
        <V0TourismView 
          ineCode={ineCode} 
          municipalityName={municipality.basic.municipio_name}
        />
      )}

      {activeTab === 'cultura' && (
        <V0CultureView
          ineCode={ineCode}
          municipalityName={municipality.basic.municipio_name}
        />
      )}

      {activeTab === 'deportes' && (
        <V0SportsView
          ineCode={ineCode}
          municipalityName={municipality.basic.municipio_name}
        />
      )}

      {activeTab !== 'ayuntamiento' && activeTab !== 'demografia' && activeTab !== 'sanidad' && activeTab !== 'educacion' && activeTab !== 'administracion' && activeTab !== 'turismo' && activeTab !== 'cultura' && activeTab !== 'deportes' && (
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-[#072357]/5 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#072357]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
            {tabs.find((t) => t.id === activeTab)?.icon && (
              <span className="text-[#072357]">
                {(() => {
                  const Icon = tabs.find((t) => t.id === activeTab)?.icon;
                  return Icon ? (
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                  ) : null;
                })()}
              </span>
            )}
          </div>
          <h4 className="text-base sm:text-lg font-semibold text-[#072357] mb-2">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h4>
          <p className="text-xs sm:text-sm text-[#072357]/50">
            Próximamente disponible
          </p>
        </div>
      )}
    </div>
  );
}
