'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Palette,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Building2,
  FileText,
  Shield,
} from 'lucide-react';
import {
  CulturalCenter,
  BienInteresCultural,
  getCulturalCentersByIne,
  getBienesInteresCulturalByIne,
  getCulturalCenterTypes,
  getBICCategories,
} from '@/lib/queries/culture';
import {
  CitizenAssociation,
  getCitizenAssociationsByIne,
  getAssociationActivityTypes,
} from '@/lib/queries/associations';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function CulturalCenterCard({ center }: { center: CulturalCenter }) {
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

function BICCard({ bic, showCategoryBadge = true }: { bic: BienInteresCultural; showCategoryBadge?: boolean }) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
              {bic.nombre}
            </h4>
          </div>
          {bic.entorno && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 shrink-0">
              <Shield className="w-3 h-3 mr-1" />
              Entorno
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
        {/* Categoría - Solo mostrar cuando showCategoryBadge es true */}
        {showCategoryBadge && bic.categoria && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357]">
              {bic.categoria}
            </span>
          </div>
        )}

        {/* Descripción */}
        {bic.descripcion && (
          <div className="text-xs sm:text-sm text-[#072357]/70 leading-relaxed">
            <p>{bic.descripcion}</p>
          </div>
        )}

        {/* Boletines oficiales */}
        {(bic.boletin1_nombre || bic.boletin2_nombre) && (
          <div className="pt-2 border-t border-[#072357]/5 space-y-2">
            {bic.boletin1_nombre && bic.boletin1_url && (
              <a
                href={bic.boletin1_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
              >
                <FileText className="w-4 h-4 text-[#072357]/40" />
                <span className="truncate">{bic.boletin1_nombre}</span>
                <ExternalLink className="w-3 h-3 text-[#072357]/40 shrink-0" />
              </a>
            )}
            {bic.boletin2_nombre && bic.boletin2_url && (
              <a
                href={bic.boletin2_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
              >
                <FileText className="w-4 h-4 text-[#072357]/40" />
                <span className="truncate">{bic.boletin2_nombre}</span>
                <ExternalLink className="w-3 h-3 text-[#072357]/40 shrink-0" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface V0CultureViewProps {
  ineCode: string;
  municipalityName: string;
  /** Offset desde top para fijar barras de tabs (igual que Turismo). */
  stickyOffsetTop?: number;
}

function AssociationCard({ association, showActivityBadge = true }: { association: CitizenAssociation; showActivityBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = association.latitud && association.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${association.longitud - 0.002},${association.latitud - 0.002},${association.longitud + 0.002},${association.latitud + 0.002}&layer=mapnik&marker=${association.latitud},${association.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {association.asociacion_nombre}
              </h4>
            </div>
            {/* Actividad badge - Solo mostrar cuando showActivityBadge es true, alineado a la derecha */}
            {showActivityBadge && association.asociacion_actividad && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
                {association.asociacion_actividad.charAt(0).toUpperCase() + association.asociacion_actividad.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {association.asociacion_direccion && (
            <button
              type="button"
              onClick={() => association.latitud && association.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                association.latitud && association.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!association.latitud || !association.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                association.latitud && association.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  association.latitud && association.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {association.asociacion_direccion}
                </p>
                {association.asociacion_codigo_postal && (
                  <p className="text-[#072357]/50">
                    {association.asociacion_codigo_postal} {association.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Ámbito */}
          {association.asociacion_ambito && (
            <div className="text-xs sm:text-sm text-[#072357]/70">
              <span className="font-medium text-[#072357]">Ámbito:</span>{' '}
              <span>{association.asociacion_ambito}</span>
            </div>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(() => {
            const hasPhone = association.asociacion_telefono && 
              association.asociacion_telefono !== '0' && 
              association.asociacion_telefono.trim() !== '';
            const hasEmail = association.asociacion_email && 
              association.asociacion_email !== '0' && 
              association.asociacion_email.trim() !== '';
            const hasWeb = association.asociacion_web && 
              association.asociacion_web !== '0' && 
              association.asociacion_web.trim() !== '';
            
            if (!hasPhone && !hasEmail && !hasWeb) return null;
            
            return (
              <div className="pt-3 space-y-2.5">
                {hasPhone && association.asociacion_telefono && (
                  <a
                    href={`tel:${association.asociacion_telefono.replace(/\s/g, '')}`}
                    className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#072357]/40" />
                    <span>{association.asociacion_telefono}</span>
                  </a>
                )}
                {hasEmail && (
                  <a
                    href={`mailto:${association.asociacion_email}`}
                    className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                  >
                    <Mail className="w-4 h-4 text-[#072357]/40" />
                    <span>{association.asociacion_email}</span>
                  </a>
                )}
                {hasWeb && association.asociacion_web && (
                  <a
                    href={association.asociacion_web.startsWith('http') ? association.asociacion_web : `https://${association.asociacion_web}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                  >
                    <Globe className="w-4 h-4 text-[#072357]/40" />
                    <span className="truncate">{association.asociacion_web}</span>
                    <ExternalLink className="w-3 h-3 text-[#072357]/40 shrink-0" />
                  </a>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Map Dialog */}
      {mapUrl && (
        <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
          <DialogContent className="max-w-4xl w-full p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b border-[#072357]/10">
              <DialogTitle className="text-lg font-semibold text-[#072357]">
                {association.asociacion_nombre}
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
                title={`Mapa de ${association.asociacion_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {association.asociacion_direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {association.asociacion_direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${association.latitud},${association.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${association.latitud}&mlon=${association.longitud}&zoom=15`}
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

const ROW_H = 48; // h-12, misma altura que Turismo

export function V0CultureView({ ineCode, municipalityName, stickyOffsetTop }: V0CultureViewProps) {
  const [activeSection, setActiveSection] = useState<'centers' | 'bic' | 'associations'>('centers');
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');

  const isSticky = stickyOffsetTop != null && stickyOffsetTop > 0;
  const bar2Top = isSticky ? stickyOffsetTop + ROW_H : undefined;
  
  // Centers state
  const [allCenters, setAllCenters] = useState<CulturalCenter[]>([]);
  const [centersLoading, setCentersLoading] = useState(false);
  
  // BIC state
  const [allBIC, setAllBIC] = useState<BienInteresCultural[]>([]);
  const [bicLoading, setBicLoading] = useState(false);

  // Associations state
  const [allAssociations, setAllAssociations] = useState<CitizenAssociation[]>([]);
  const [associationsLoading, setAssociationsLoading] = useState(false);

  // Load centers
  useEffect(() => {
    setCentersLoading(true);
    getCulturalCentersByIne(ineCode)
      .then((data) => {
        setAllCenters(data);
        setCentersLoading(false);
      })
      .catch((error) => {
        console.error('Error loading cultural centers:', error);
        setCentersLoading(false);
      });
  }, [ineCode]);

  // Load BIC
  useEffect(() => {
    setBicLoading(true);
    getBienesInteresCulturalByIne(ineCode)
      .then((data) => {
        setAllBIC(data);
        setBicLoading(false);
      })
      .catch((error) => {
        console.error('Error loading BIC:', error);
        setBicLoading(false);
      });
  }, [ineCode]);

  // Load associations
  useEffect(() => {
    setAssociationsLoading(true);
    getCitizenAssociationsByIne(ineCode)
      .then((data) => {
        setAllAssociations(data);
        setAssociationsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading associations:', error);
        setAssociationsLoading(false);
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

  // Get unique BIC categories
  const uniqueBICCategories = useMemo(() => {
    const categories = new Set<string>();
    allBIC.forEach((bic) => {
      if (bic.categoria) {
        categories.add(bic.categoria);
      }
    });
    return Array.from(categories).sort();
  }, [allBIC]);

  // Get unique association activity types
  const uniqueAssociationActivities = useMemo(() => {
    const activities = new Set<string>();
    allAssociations.forEach((assoc) => {
      if (assoc.asociacion_actividad) {
        activities.add(assoc.asociacion_actividad);
      }
    });
    return Array.from(activities).sort();
  }, [allAssociations]);

  // Count centers by type
  const centerCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allCenters.length };
    allCenters.forEach((center) => {
      const type = center.tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allCenters]);

  // Count BIC by category
  const bicCountByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: allBIC.length };
    allBIC.forEach((bic) => {
      const category = bic.categoria || 'Sin categoría';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [allBIC]);

  // Count associations by activity
  const associationCountByActivity = useMemo(() => {
    const counts: Record<string, number> = { all: allAssociations.length };
    allAssociations.forEach((assoc) => {
      const activity = assoc.asociacion_actividad || 'Sin actividad';
      counts[activity] = (counts[activity] || 0) + 1;
    });
    return counts;
  }, [allAssociations]);

  // Filter centers
  const filteredCenters = useMemo(() => {
    if (activeFilter === 'all') {
      return allCenters;
    }
    return allCenters.filter((center) => center.tipo === activeFilter);
  }, [allCenters, activeFilter]);

  // Filter BIC
  const filteredBIC = useMemo(() => {
    if (activeFilter === 'all') {
      return allBIC;
    }
    return allBIC.filter((bic) => bic.categoria === activeFilter);
  }, [allBIC, activeFilter]);

  // Filter associations
  const filteredAssociations = useMemo(() => {
    if (activeFilter === 'all') {
      return allAssociations;
    }
    return allAssociations.filter((assoc) => assoc.asociacion_actividad === activeFilter);
  }, [allAssociations, activeFilter]);

  // Reset filter when switching sections
  useEffect(() => {
    setActiveFilter('all');
  }, [activeSection]);

  const isLoading = 
    activeSection === 'centers' ? centersLoading :
    activeSection === 'bic' ? bicLoading :
    associationsLoading;
  const uniqueTypes = 
    activeSection === 'centers' ? uniqueCenterTypes :
    activeSection === 'bic' ? uniqueBICCategories :
    uniqueAssociationActivities;
  const countByType = 
    activeSection === 'centers' ? centerCountByType :
    activeSection === 'bic' ? bicCountByCategory :
    associationCountByActivity;

  const loading = centersLoading || bicLoading || associationsLoading;
  const showCentersTab = !centersLoading && allCenters.length > 0;
  const showBicTab = !bicLoading && allBIC.length > 0;
  const showAssociationsTab = !associationsLoading && allAssociations.length > 0;
  const hasAnyTab = showCentersTab || showBicTab || showAssociationsTab;

  useEffect(() => {
    if (loading || !hasAnyTab) return;
    const isCurrentVisible =
      (activeSection === 'centers' && showCentersTab) ||
      (activeSection === 'bic' && showBicTab) ||
      (activeSection === 'associations' && showAssociationsTab);
    if (!isCurrentVisible) {
      if (showCentersTab) setActiveSection('centers');
      else if (showBicTab) setActiveSection('bic');
      else if (showAssociationsTab) setActiveSection('associations');
      setActiveFilter('all');
    }
  }, [loading, hasAnyTab, activeSection, showCentersTab, showBicTab, showAssociationsTab]);

  return (
    <div className="space-y-0">
      {/* Barra 1: sticky top = stickyOffsetTop (igual que Turismo) */}
      {hasAnyTab && (
        <div
          className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
          style={
            isSticky && stickyOffsetTop != null
              ? { position: 'sticky', top: stickyOffsetTop, zIndex: 20, backgroundColor: '#f5f8fa' }
              : undefined
          }
        >
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
          <div
            className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
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
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Centros culturales
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
                {showAssociationsTab && (
              <button
                type="button"
                onClick={() => setActiveSection('associations')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'associations'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Asociaciones
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'associations'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allAssociations.length}
                </span>
              </button>
                )}
                {showBicTab && (
              <button
                type="button"
                onClick={() => setActiveSection('bic')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'bic'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Bienes de Interés Cultural
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'bic'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allBIC.length}
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
          <Palette className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay datos de cultura en este municipio</p>
        </div>
      )}

      {/* Barra 2: sticky top = stickyOffsetTop + ROW_H (igual que Turismo) */}
      {hasAnyTab && (
      <div
        className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
        style={
          bar2Top != null
            ? { position: 'sticky', top: bar2Top, zIndex: 10, backgroundColor: '#f5f8fa' }
            : undefined
        }
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
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : activeSection === 'bic' ? (
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

      {/* Contenido con máscara de degradado (igual que Turismo) */}
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
              <CulturalCenterCard key={center.id} center={center} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay centros culturales de este tipo en el municipio</p>
          </div>
        )
      ) : activeSection === 'bic' ? (
        filteredBIC.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredBIC.map((bic) => (
              <BICCard 
                key={bic.id} 
                bic={bic} 
                showCategoryBadge={activeFilter === 'all'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay bienes de interés cultural de este tipo en el municipio</p>
          </div>
        )
      ) : filteredAssociations.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredAssociations.map((association) => (
            <AssociationCard 
              key={association.id} 
              association={association} 
              showActivityBadge={activeFilter === 'all'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#072357]/50">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay asociaciones de este tipo en el municipio</p>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
