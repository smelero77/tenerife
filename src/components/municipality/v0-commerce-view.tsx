'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  ShoppingBag,
  Store,
} from 'lucide-react';
import {
  FoodStore,
  CommercialPremise,
  getFoodStoresByIne,
  getCommercialPremisesByIne,
} from '@/lib/queries/commerce';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function FoodStoreCard({ store, showTypeBadge = true }: { store: FoodStore; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = store.latitud && store.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${store.longitud - 0.002},${store.latitud - 0.002},${store.longitud + 0.002},${store.latitud + 0.002}&layer=mapnik&marker=${store.latitud},${store.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {store.comercio_nombre}
              </h4>
            </div>
            {/* Tipo badge - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
            {showTypeBadge && store.comercio_tipo && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
                {store.comercio_tipo.charAt(0).toUpperCase() + store.comercio_tipo.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {store.comercio_direccion && (
            <button
              type="button"
              onClick={() => store.latitud && store.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                store.latitud && store.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!store.latitud || !store.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                store.latitud && store.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  store.latitud && store.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {store.comercio_direccion}
                </p>
                {store.comercio_codigo_postal && (
                  <p className="text-[#072357]/50">
                    {store.comercio_codigo_postal} {store.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(store.comercio_telefono || store.comercio_email || store.comercio_web) && (
            <div className="pt-3 space-y-2.5">
              {store.comercio_telefono && (
                <a
                  href={`tel:${store.comercio_telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{store.comercio_telefono}</span>
                </a>
              )}
              {store.comercio_email && (
                <a
                  href={`mailto:${store.comercio_email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{store.comercio_email}</span>
                </a>
              )}
              {store.comercio_web && (
                <a
                  href={store.comercio_web.startsWith('http') ? store.comercio_web : `https://${store.comercio_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{store.comercio_web}</span>
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
                {store.comercio_nombre}
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
                title={`Mapa de ${store.comercio_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {store.comercio_direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {store.comercio_direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${store.latitud},${store.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${store.latitud}&mlon=${store.longitud}&zoom=15`}
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

function CommercialPremiseCard({ premise, showTypeBadge = true }: { premise: CommercialPremise; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = premise.latitud && premise.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${premise.longitud - 0.002},${premise.latitud - 0.002},${premise.longitud + 0.002},${premise.latitud + 0.002}&layer=mapnik&marker=${premise.latitud},${premise.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {premise.local_nombre}
              </h4>
            </div>
            {/* Tipo badge - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
            {showTypeBadge && premise.local_tipo && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
                {premise.local_tipo.charAt(0).toUpperCase() + premise.local_tipo.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {premise.local_direccion && (
            <button
              type="button"
              onClick={() => premise.latitud && premise.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                premise.latitud && premise.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!premise.latitud || !premise.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                premise.latitud && premise.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  premise.latitud && premise.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {premise.local_direccion}
                </p>
                {premise.local_codigo_postal && (
                  <p className="text-[#072357]/50">
                    {premise.local_codigo_postal} {premise.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(premise.local_telefono || premise.local_email || premise.local_web) && (
            <div className="pt-3 space-y-2.5">
              {premise.local_telefono && (
                <a
                  href={`tel:${premise.local_telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{premise.local_telefono}</span>
                </a>
              )}
              {premise.local_email && (
                <a
                  href={`mailto:${premise.local_email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{premise.local_email}</span>
                </a>
              )}
              {premise.local_web && (
                <a
                  href={premise.local_web.startsWith('http') ? premise.local_web : `https://${premise.local_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{premise.local_web}</span>
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
                {premise.local_nombre}
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
                title={`Mapa de ${premise.local_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {premise.local_direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {premise.local_direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${premise.latitud},${premise.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${premise.latitud}&mlon=${premise.longitud}&zoom=15`}
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

interface V0CommerceViewProps {
  ineCode: string;
  municipalityName: string;
  stickyOffsetTop?: number;
}

const ROW_H = 48;

export function V0CommerceView({ ineCode, municipalityName, stickyOffsetTop }: V0CommerceViewProps) {
  const isSticky = stickyOffsetTop != null && stickyOffsetTop > 0;
  const bar2Top = isSticky ? stickyOffsetTop + ROW_H : undefined;

  // Section selector
  const [activeSection, setActiveSection] = useState<'foodStores' | 'premises'>('foodStores');
  
  // Food Stores Section
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');
  const [allFoodStores, setAllFoodStores] = useState<FoodStore[]>([]);
  const [foodStoresLoading, setFoodStoresLoading] = useState(false);

  // Commercial Premises Section
  const [allPremises, setAllPremises] = useState<CommercialPremise[]>([]);
  const [premisesLoading, setPremisesLoading] = useState(false);

  // Load food stores
  useEffect(() => {
    setFoodStoresLoading(true);
    getFoodStoresByIne(ineCode)
      .then((data) => {
        setAllFoodStores(data);
        setFoodStoresLoading(false);
      })
      .catch((error) => {
        console.error('Error loading food stores:', error);
        setFoodStoresLoading(false);
      });
  }, [ineCode]);

  // Load commercial premises
  useEffect(() => {
    setPremisesLoading(true);
    getCommercialPremisesByIne(ineCode)
      .then((data) => {
        setAllPremises(data);
        setPremisesLoading(false);
      })
      .catch((error) => {
        console.error('Error loading commercial premises:', error);
        setPremisesLoading(false);
      });
  }, [ineCode]);

  // Get unique types for food stores
  const foodStoreTypes = useMemo(() => {
    const types = new Set<string>();
    allFoodStores.forEach((store) => {
      if (store.comercio_tipo) {
        types.add(store.comercio_tipo);
      }
    });
    return Array.from(types).sort();
  }, [allFoodStores]);

  // Get unique types for commercial premises
  const premiseTypes = useMemo(() => {
    const types = new Set<string>();
    allPremises.forEach((premise) => {
      if (premise.local_tipo) {
        types.add(premise.local_tipo);
      }
    });
    return Array.from(types).sort();
  }, [allPremises]);

  // Count by type for food stores
  const foodStoreCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allFoodStores.length };
    allFoodStores.forEach((store) => {
      const type = store.comercio_tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allFoodStores]);

  // Count by type for commercial premises
  const premiseCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allPremises.length };
    allPremises.forEach((premise) => {
      const type = premise.local_tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allPremises]);

  // Reset filter when switching sections
  useEffect(() => {
    setActiveFilter('all');
  }, [activeSection]);

  const isLoading = activeSection === 'foodStores' ? foodStoresLoading : premisesLoading;

  const uniqueTypes = activeSection === 'foodStores' ? foodStoreTypes : premiseTypes;

  const countByType = activeSection === 'foodStores' ? foodStoreCountByType : premiseCountByType;

  const loading = foodStoresLoading || premisesLoading;
  const showFoodStoresTab = !foodStoresLoading && allFoodStores.length > 0;
  const showPremisesTab = !premisesLoading && allPremises.length > 0;
  const hasAnyTab = showFoodStoresTab || showPremisesTab;

  useEffect(() => {
    if (loading || !hasAnyTab) return;
    const isCurrentVisible =
      (activeSection === 'foodStores' && showFoodStoresTab) ||
      (activeSection === 'premises' && showPremisesTab);
    if (!isCurrentVisible) {
      if (showFoodStoresTab) setActiveSection('foodStores');
      else if (showPremisesTab) setActiveSection('premises');
      setActiveFilter('all');
    }
  }, [loading, hasAnyTab, activeSection, showFoodStoresTab, showPremisesTab]);

  // Filter based on active section and filter
  const filteredFoodStores = useMemo(() => {
    if (activeFilter === 'all') {
      return allFoodStores;
    }
    return allFoodStores.filter((store) => store.comercio_tipo === activeFilter);
  }, [allFoodStores, activeFilter]);

  const filteredPremises = useMemo(() => {
    if (activeFilter === 'all') {
      return allPremises;
    }
    return allPremises.filter((premise) => premise.local_tipo === activeFilter);
  }, [allPremises, activeFilter]);

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
                {showFoodStoresTab && (
              <button
                type="button"
                onClick={() => setActiveSection('foodStores')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'foodStores'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Alimentación
                <span
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'foodStores'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allFoodStores.length}
                </span>
              </button>
                )}
                {showPremisesTab && (
              <button
                type="button"
                onClick={() => setActiveSection('premises')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'premises'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Locales Comerciales
                <span
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'premises'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allPremises.length}
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
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay datos de comercios en este municipio</p>
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
                {activeSection === 'foodStores' ? (
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
        ) : activeSection === 'foodStores' && filteredFoodStores.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredFoodStores.map((store) => (
              <FoodStoreCard
                key={store.id}
                store={store}
                showTypeBadge={activeFilter === 'all'}
              />
            ))}
          </div>
        ) : activeSection === 'premises' && filteredPremises.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredPremises.map((premise) => (
              <CommercialPremiseCard
                key={premise.id}
                premise={premise}
                showTypeBadge={activeFilter === 'all'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            {activeSection === 'foodStores' ? (
              <>
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay comercios de alimentación en el municipio</p>
              </>
            ) : (
              <>
                <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay locales comerciales en el municipio</p>
              </>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
}
