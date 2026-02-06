'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Factory,
  Briefcase,
} from 'lucide-react';
import {
  IndustrialCompany,
  ServiceCompany,
  getIndustrialCompaniesByIne,
  getServiceCompaniesByIne,
  getIndustrialCompanyTypes,
  getServiceCompanyTypes,
} from '@/lib/queries/companies';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function IndustrialCompanyCard({ company, showTypeBadge = true }: { company: IndustrialCompany; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = company.latitud && company.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${company.longitud - 0.002},${company.latitud - 0.002},${company.longitud + 0.002},${company.latitud + 0.002}&layer=mapnik&marker=${company.latitud},${company.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {company.empresa_nombre}
              </h4>
            </div>
            {/* Tipo badge - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
            {showTypeBadge && company.empresa_tipo && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
                {company.empresa_tipo.charAt(0).toUpperCase() + company.empresa_tipo.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {company.empresa_direccion && (
            <button
              type="button"
              onClick={() => company.latitud && company.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                company.latitud && company.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!company.latitud || !company.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                company.latitud && company.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  company.latitud && company.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {company.empresa_direccion}
                </p>
                {company.empresa_codigo_postal && (
                  <p className="text-[#072357]/50">
                    {company.empresa_codigo_postal} {company.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(company.empresa_telefono || company.empresa_email || company.empresa_web) && (
            <div className="pt-3 space-y-2.5">
              {company.empresa_telefono && (
                <a
                  href={`tel:${company.empresa_telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{company.empresa_telefono}</span>
                </a>
              )}
              {company.empresa_email && (
                <a
                  href={`mailto:${company.empresa_email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{company.empresa_email}</span>
                </a>
              )}
              {company.empresa_web && (
                <a
                  href={company.empresa_web.startsWith('http') ? company.empresa_web : `https://${company.empresa_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{company.empresa_web}</span>
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
                {company.empresa_nombre}
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
                title={`Mapa de ${company.empresa_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {company.empresa_direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {company.empresa_direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${company.latitud},${company.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${company.latitud}&mlon=${company.longitud}&zoom=15`}
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

function ServiceCompanyCard({ company, showTypeBadge = true }: { company: ServiceCompany; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = company.latitud && company.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${company.longitud - 0.002},${company.latitud - 0.002},${company.longitud + 0.002},${company.latitud + 0.002}&layer=mapnik&marker=${company.latitud},${company.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {company.empresa_nombre}
              </h4>
            </div>
            {/* Tipo badge - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
            {showTypeBadge && company.empresa_tipo && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
                {company.empresa_tipo.charAt(0).toUpperCase() + company.empresa_tipo.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {company.empresa_direccion && (
            <button
              type="button"
              onClick={() => company.latitud && company.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                company.latitud && company.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!company.latitud || !company.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                company.latitud && company.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  company.latitud && company.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {company.empresa_direccion}
                </p>
                {company.empresa_codigo_postal && (
                  <p className="text-[#072357]/50">
                    {company.empresa_codigo_postal} {company.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(company.empresa_telefono || company.empresa_email || company.empresa_web) && (
            <div className="pt-3 space-y-2.5">
              {company.empresa_telefono && (
                <a
                  href={`tel:${company.empresa_telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{company.empresa_telefono}</span>
                </a>
              )}
              {company.empresa_email && (
                <a
                  href={`mailto:${company.empresa_email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{company.empresa_email}</span>
                </a>
              )}
              {company.empresa_web && (
                <a
                  href={company.empresa_web.startsWith('http') ? company.empresa_web : `https://${company.empresa_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{company.empresa_web}</span>
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
                {company.empresa_nombre}
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
                title={`Mapa de ${company.empresa_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {company.empresa_direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {company.empresa_direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${company.latitud},${company.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${company.latitud}&mlon=${company.longitud}&zoom=15`}
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

interface V0CompaniesViewProps {
  ineCode: string;
  municipalityName: string;
  stickyOffsetTop?: number;
}

const ROW_H = 48;

export function V0CompaniesView({ ineCode, municipalityName, stickyOffsetTop }: V0CompaniesViewProps) {
  const isSticky = stickyOffsetTop != null && stickyOffsetTop > 0;
  const bar2Top = isSticky ? stickyOffsetTop + ROW_H : undefined;

  // Section selector
  const [activeSection, setActiveSection] = useState<'industrial' | 'services'>('industrial');
  
  // Industrial Companies Section
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');
  const [allIndustrialCompanies, setAllIndustrialCompanies] = useState<IndustrialCompany[]>([]);
  const [industrialLoading, setIndustrialLoading] = useState(false);

  // Service Companies Section
  const [allServiceCompanies, setAllServiceCompanies] = useState<ServiceCompany[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Load industrial companies
  useEffect(() => {
    setIndustrialLoading(true);
    getIndustrialCompaniesByIne(ineCode)
      .then((data) => {
        setAllIndustrialCompanies(data);
        setIndustrialLoading(false);
      })
      .catch((error) => {
        console.error('Error loading industrial companies:', error);
        setIndustrialLoading(false);
      });
  }, [ineCode]);

  // Load service companies
  useEffect(() => {
    setServicesLoading(true);
    getServiceCompaniesByIne(ineCode)
      .then((data) => {
        setAllServiceCompanies(data);
        setServicesLoading(false);
      })
      .catch((error) => {
        console.error('Error loading service companies:', error);
        setServicesLoading(false);
      });
  }, [ineCode]);

  // Get unique types for industrial companies
  const industrialTypes = useMemo(() => {
    const types = new Set<string>();
    allIndustrialCompanies.forEach((company) => {
      if (company.empresa_tipo) {
        types.add(company.empresa_tipo);
      }
    });
    return Array.from(types).sort();
  }, [allIndustrialCompanies]);

  // Get unique types for service companies
  const serviceTypes = useMemo(() => {
    const types = new Set<string>();
    allServiceCompanies.forEach((company) => {
      if (company.empresa_tipo) {
        types.add(company.empresa_tipo);
      }
    });
    return Array.from(types).sort();
  }, [allServiceCompanies]);

  // Count by type for industrial companies
  const industrialCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allIndustrialCompanies.length };
    allIndustrialCompanies.forEach((company) => {
      const type = company.empresa_tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allIndustrialCompanies]);

  // Count by type for service companies
  const serviceCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allServiceCompanies.length };
    allServiceCompanies.forEach((company) => {
      const type = company.empresa_tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allServiceCompanies]);

  // Reset filter when switching sections
  useEffect(() => {
    setActiveFilter('all');
  }, [activeSection]);

  const isLoading = activeSection === 'industrial' ? industrialLoading : servicesLoading;

  const uniqueTypes = activeSection === 'industrial' ? industrialTypes : serviceTypes;

  const countByType = activeSection === 'industrial' ? industrialCountByType : serviceCountByType;

  const loading = industrialLoading || servicesLoading;
  const showIndustrialTab = !industrialLoading && allIndustrialCompanies.length > 0;
  const showServicesTab = !servicesLoading && allServiceCompanies.length > 0;
  const hasAnyTab = showIndustrialTab || showServicesTab;

  useEffect(() => {
    if (loading || !hasAnyTab) return;
    const isCurrentVisible =
      (activeSection === 'industrial' && showIndustrialTab) ||
      (activeSection === 'services' && showServicesTab);
    if (!isCurrentVisible) {
      queueMicrotask(() => {
        if (showIndustrialTab) setActiveSection('industrial');
        else if (showServicesTab) setActiveSection('services');
        setActiveFilter('all');
      });
    }
  }, [loading, hasAnyTab, activeSection, showIndustrialTab, showServicesTab]);

  // Filter based on active section and filter
  const filteredIndustrialCompanies = useMemo(() => {
    if (activeFilter === 'all') {
      return allIndustrialCompanies;
    }
    return allIndustrialCompanies.filter((company) => company.empresa_tipo === activeFilter);
  }, [allIndustrialCompanies, activeFilter]);

  const filteredServiceCompanies = useMemo(() => {
    if (activeFilter === 'all') {
      return allServiceCompanies;
    }
    return allServiceCompanies.filter((company) => company.empresa_tipo === activeFilter);
  }, [allServiceCompanies, activeFilter]);

  return (
    <div className="space-y-0">
      {hasAnyTab && (
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
                {showIndustrialTab && (
              <button
                type="button"
                onClick={() => setActiveSection('industrial')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'industrial'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Factory className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Industrial
                <span
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'industrial'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allIndustrialCompanies.length}
                </span>
              </button>
                )}
                {showServicesTab && (
              <button
                type="button"
                onClick={() => setActiveSection('services')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'services'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Servicios
                <span
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'services'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allServiceCompanies.length}
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
          <Factory className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay datos de empresas en este municipio</p>
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
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                {activeSection === 'industrial' ? (
                  <Factory className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    {type.charAt(0).toUpperCase() + type.slice(1)}
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
      ) : activeSection === 'industrial' && filteredIndustrialCompanies.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredIndustrialCompanies.map((company) => (
            <IndustrialCompanyCard
              key={company.id}
              company={company}
              showTypeBadge={activeFilter === 'all'}
            />
          ))}
        </div>
      ) : activeSection === 'services' && filteredServiceCompanies.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredServiceCompanies.map((company) => (
            <ServiceCompanyCard
              key={company.id}
              company={company}
              showTypeBadge={activeFilter === 'all'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#072357]/50">
          {activeSection === 'industrial' ? (
            <>
              <Factory className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay empresas industriales de este tipo en el municipio</p>
            </>
          ) : (
            <>
              <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay empresas de servicios de este tipo en el municipio</p>
            </>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
