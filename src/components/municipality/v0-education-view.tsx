'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Calendar,
  Clock,
  Users,
  Building2,
  AlertCircle,
} from 'lucide-react';
import {
  EducationalCenter,
  TrainingActivity,
  getEducationalCentersByIne,
  getTrainingActivitiesByIne,
  getEducationalCenterTypes,
  getTrainingActivityTypes,
} from '@/lib/queries/education';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatNumber } from '@/lib/utils';

function EducationalCenterCard({ center, showTypeBadge = true }: { center: EducationalCenter; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = center.latitud && center.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${center.longitud - 0.002},${center.latitud - 0.002},${center.longitud + 0.002},${center.latitud + 0.002}&layer=mapnik&marker=${center.latitud},${center.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {center.nombre}
              </h4>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Tipo - Solo mostrar cuando showTypeBadge es true */}
          {showTypeBadge && center.tipo && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357]">
                {center.tipo}
              </span>
            </div>
          )}

          {/* Address - Clickable to open map */}
          {center.direccion && (
            <button
              type="button"
              onClick={() => center.latitud && center.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                center.latitud && center.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!center.latitud || !center.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                center.latitud && center.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  center.latitud && center.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {center.direccion}
                </p>
                {center.codigo_postal && (
                  <p className="text-[#072357]/50">
                    {center.codigo_postal} {center.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(center.telefono || center.email || center.web) && (
            <div className="pt-3 space-y-2.5">
              {center.telefono && (
                <a
                  href={`tel:${center.telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{center.telefono}</span>
                </a>
              )}
              {center.email && (
                <a
                  href={`mailto:${center.email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{center.email}</span>
                </a>
              )}
              {center.web && (
                <a
                  href={center.web.startsWith('http') ? center.web : `https://${center.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{center.web}</span>
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
                {center.nombre}
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
                title={`Mapa de ${center.nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {center.direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {center.direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${center.latitud},${center.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${center.latitud}&mlon=${center.longitud}&zoom=15`}
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

function TrainingActivityCard({ activity, showTypeBadge = true }: { activity: TrainingActivity; showTypeBadge?: boolean }) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Calculate days until start
  const getDaysUntilStart = (): number | null => {
    if (!activity.inicio) return null;
    try {
      const startDate = new Date(activity.inicio);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : null;
    } catch {
      return null;
    }
  };

  const daysUntilStart = getDaysUntilStart();
  const startsSoon = daysUntilStart !== null && daysUntilStart < 10;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
              {activity.titulo}
            </h4>
            {activity.actividad_id && (
              <p className="text-xs text-[#072357]/50 mt-1">
                ID: {activity.actividad_id}
              </p>
            )}
          </div>
          {/* Badge "empieza pronto" si quedan menos de 10 días */}
          {startsSoon && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shrink-0 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              Empieza pronto
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
        {/* Tipo - Solo mostrar cuando showTypeBadge es true */}
        {showTypeBadge && activity.tipo && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357]">
              {activity.tipo}
            </span>
          </div>
        )}

        {/* Fechas */}
        {(activity.inicio || activity.fin) && (
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
            <Calendar className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
            <div className="flex-1">
              {activity.inicio && (
                <p>
                  <span className="font-medium">Inicio:</span> {formatDate(activity.inicio)}
                  {daysUntilStart !== null && (
                    <span className="ml-2 text-[#072357]/60">
                      ({daysUntilStart === 0 ? 'Hoy' : daysUntilStart === 1 ? 'Mañana' : `En ${daysUntilStart} días`})
                    </span>
                  )}
                </p>
              )}
              {activity.fin && (
                <p>
                  <span className="font-medium">Fin:</span> {formatDate(activity.fin)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Lugar y Agencia */}
        {(activity.lugar_nombre || activity.agencia_nombre) && (
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
            <Building2 className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
            <div className="flex-1">
              {activity.lugar_nombre && (
                <p>
                  <span className="font-medium">Lugar:</span> {activity.lugar_nombre}
                </p>
              )}
              {activity.agencia_nombre && (
                <p>
                  <span className="font-medium">Agencia:</span> {activity.agencia_nombre}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Duración y detalles */}
        <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-[#072357]/5">
          {activity.dias && (
            <div className="flex items-center gap-1.5 text-xs text-[#072357]/70">
              <Calendar className="w-3.5 h-3.5 text-[#072357]/40" />
              <span>{activity.dias} {activity.dias === 1 ? 'día' : 'días'}</span>
            </div>
          )}
          {activity.horas && (
            <div className="flex items-center gap-1.5 text-xs text-[#072357]/70">
              <Clock className="w-3.5 h-3.5 text-[#072357]/40" />
              <span>{formatNumber(activity.horas)} h</span>
            </div>
          )}
          {activity.plazas && (
            <div className="flex items-center gap-1.5 text-xs text-[#072357]/70">
              <Users className="w-3.5 h-3.5 text-[#072357]/40" />
              <span>{formatNumber(activity.plazas)} plazas</span>
            </div>
          )}
        </div>

        {/* Horario */}
        {activity.horario && (
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70 pt-2 border-t border-[#072357]/5">
            <Clock className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Horario:</span> {activity.horario}
            </div>
          </div>
        )}

        {/* Inscripción */}
        {activity.inscripcion_estado && (
          <div className="pt-2 border-t border-[#072357]/5">
            <p className="text-xs text-[#072357]/70">
              <span className="font-medium">Inscripción:</span> {activity.inscripcion_estado}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface V0EducationViewProps {
  ineCode: string;
  municipalityName: string;
  stickyOffsetTop?: number;
}

const ROW_H = 48;

export function V0EducationView({ ineCode, municipalityName, stickyOffsetTop }: V0EducationViewProps) {
  const [activeSection, setActiveSection] = useState<'centers' | 'activities'>('centers');
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');
  const isSticky = stickyOffsetTop != null && stickyOffsetTop > 0;
  const bar2Top = isSticky ? stickyOffsetTop + ROW_H : undefined;

  // Centers state
  const [allCenters, setAllCenters] = useState<EducationalCenter[]>([]);
  const [centersLoading, setCentersLoading] = useState(false);
  
  // Activities state
  const [allActivities, setAllActivities] = useState<TrainingActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Load centers
  useEffect(() => {
    setCentersLoading(true);
    getEducationalCentersByIne(ineCode)
      .then((data) => {
        setAllCenters(data);
        setCentersLoading(false);
      })
      .catch((error) => {
        console.error('Error loading educational centers:', error);
        setCentersLoading(false);
      });
  }, [ineCode]);

  // Load activities
  useEffect(() => {
    setActivitiesLoading(true);
    getTrainingActivitiesByIne(ineCode)
      .then((data) => {
        setAllActivities(data);
        setActivitiesLoading(false);
      })
      .catch((error) => {
        console.error('Error loading training activities:', error);
        setActivitiesLoading(false);
      });
  }, [ineCode]);

  // Get unique center types
  const uniqueCenterTypes = useMemo(() => {
    const types = new Set<string>();
    allCenters.forEach((center) => {
      if (center.tipo) {
        types.add(center.tipo);
      }
    });
    return Array.from(types).sort();
  }, [allCenters]);

  // Get unique activity types
  const uniqueActivityTypes = useMemo(() => {
    const types = new Set<string>();
    allActivities.forEach((activity) => {
      if (activity.tipo) {
        types.add(activity.tipo);
      }
    });
    return Array.from(types).sort();
  }, [allActivities]);

  // Count centers by type
  const centerCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allCenters.length };
    allCenters.forEach((center) => {
      const type = center.tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allCenters]);

  // Count activities by type - only count future activities
  const activityCountByType = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureActivities = allActivities.filter((activity) => {
      if (!activity.inicio) return false;
      try {
        const startDate = new Date(activity.inicio);
        startDate.setHours(0, 0, 0, 0);
        return startDate >= today;
      } catch {
        return false;
      }
    });

    const counts: Record<string, number> = { all: futureActivities.length };
    futureActivities.forEach((activity) => {
      const type = activity.tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allActivities]);

  // Filter centers
  const filteredCenters = useMemo(() => {
    if (activeFilter === 'all') {
      return allCenters;
    }
    return allCenters.filter((center) => center.tipo === activeFilter);
  }, [allCenters, activeFilter]);

  // Filter activities - only show future activities
  const filteredActivities = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureActivities = allActivities.filter((activity) => {
      if (!activity.inicio) return false;
      try {
        const startDate = new Date(activity.inicio);
        startDate.setHours(0, 0, 0, 0);
        return startDate >= today;
      } catch {
        return false;
      }
    });

    if (activeFilter === 'all') {
      return futureActivities;
    }
    return futureActivities.filter((activity) => activity.tipo === activeFilter);
  }, [allActivities, activeFilter]);

  // Reset filter when switching sections
  useEffect(() => {
    setActiveFilter('all');
  }, [activeSection]);

  const isLoading = activeSection === 'centers' ? centersLoading : activitiesLoading;
  const uniqueTypes = activeSection === 'centers' ? uniqueCenterTypes : uniqueActivityTypes;
  const countByType = activeSection === 'centers' ? centerCountByType : activityCountByType;

  const loading = centersLoading || activitiesLoading;
  const showCentersTab = !centersLoading && allCenters.length > 0;
  const futureActivitiesCount = activityCountByType.all || 0;
  const showActivitiesTab = !activitiesLoading && futureActivitiesCount > 0;
  const hasAnyTab = showCentersTab || showActivitiesTab;

  useEffect(() => {
    if (loading || !hasAnyTab) return;
    const isCurrentVisible =
      (activeSection === 'centers' && showCentersTab) ||
      (activeSection === 'activities' && showActivitiesTab);
    if (!isCurrentVisible) {
      queueMicrotask(() => {
        if (showCentersTab) setActiveSection('centers');
        else if (showActivitiesTab) setActiveSection('activities');
        setActiveFilter('all');
      });
    }
  }, [loading, hasAnyTab, activeSection, showCentersTab, showActivitiesTab]);

  return (
    <div className="space-y-0">
      {hasAnyTab && (
        <div
          className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
          style={isSticky && stickyOffsetTop != null ? { position: 'sticky', top: stickyOffsetTop, zIndex: 20, backgroundColor: '#f5f8fa' } : undefined}
        >
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
          <div
            className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
            {loading ? (
              <>
                {[1, 2].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-9 sm:h-10 w-24 sm:w-28 rounded-full shrink-0"
                  />
                ))}
              </>
            ) : (
              <>
                {showCentersTab && (
              <button
                type="button"
                onClick={() => setActiveSection('centers')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'centers'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Centros educativos
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'centers'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allCenters.length}
                </span>
              </button>
                )}
                {showActivitiesTab && (
              <button
                type="button"
                onClick={() => setActiveSection('activities')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'activities'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Actividades formativas
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'activities'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return allActivities.filter((activity) => {
                      if (!activity.inicio) return false;
                      try {
                        const startDate = new Date(activity.inicio);
                        startDate.setHours(0, 0, 0, 0);
                        return startDate >= today;
                      } catch {
                        return false;
                      }
                    }).length;
                  })()}
                </span>
              </button>
                )}
            </>
          )}
        </div>
      </div>
      )}

      {!loading && !hasAnyTab && (
        <div className="text-center py-8 text-[#072357]/50">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay datos de educación en este municipio</p>
        </div>
      )}

      {hasAnyTab && (
      <div
        className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
        style={bar2Top != null ? { position: 'sticky', top: bar2Top, zIndex: 10, backgroundColor: '#f5f8fa' } : undefined}
      >
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f7fa] to-transparent z-10 pointer-events-none sm:hidden" />
        <div
          className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading ? (
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
                {activeSection === 'centers' ? (
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
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
                // Capitalize first letter
                const label = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

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
      )}

      {hasAnyTab && (
        <div className="relative">
      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
            >
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                <Skeleton className="h-4 sm:h-5 w-3/4" />
              </div>
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
      ) : activeSection === 'centers' ? (
        filteredCenters.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredCenters.map((center) => (
              <EducationalCenterCard 
                key={center.id} 
                center={center} 
                showTypeBadge={activeFilter === 'all'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay centros educativos de este tipo en el municipio</p>
          </div>
        )
      ) : filteredActivities.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredActivities.map((activity) => (
            <TrainingActivityCard 
              key={activity.id} 
              activity={activity} 
              showTypeBadge={activeFilter === 'all'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#072357]/50">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay actividades formativas de este tipo en el municipio</p>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
