'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Camera,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Building2,
  UtensilsCrossed,
  Briefcase,
  Info,
  Calendar,
  Users,
  Home,
  Star,
  Key,
  TreePine,
} from 'lucide-react';
import {
  TouristAccommodation,
  HospitalityEstablishment,
  TourismEstablishment,
  TouristInformationOffice,
  getTouristAccommodationsByIne,
  getHospitalityEstablishmentsByIne,
  getTourismEstablishmentsByIne,
  getTouristInformationOfficesByIne,
  getAccommodationTypes,
  getHospitalityTypes,
  getTourismEstablishmentActivities,
} from '@/lib/queries/tourism';
import {
  PublicEquipment,
  getPublicEquipmentByIne,
  getEquipmentTypes,
} from '@/lib/queries/equipment';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatNumber } from '@/lib/utils';

// ============================================================================
// Tourist Accommodation Card
// ============================================================================

function AccommodationCard({ accommodation, showTypeBadge = true }: { accommodation: TouristAccommodation; showTypeBadge?: boolean }) {
  // Determine icon based on category type
  const getCategoryIcon = (categoria: string | null) => {
    if (!categoria) return null;
    
    const categoriaLower = categoria.toLowerCase();
    
    if (categoriaLower.includes('estrella')) {
      return <Star className="w-3 h-3 text-yellow-500" />;
    }
    if (categoriaLower.includes('llave')) {
      return <Key className="w-3 h-3 text-yellow-500" />;
    }
    if (categoriaLower.includes('palmera')) {
      return <TreePine className="w-3 h-3 text-yellow-500" />;
    }
    
    return null;
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
              {accommodation.nombre}
            </h4>
            {accommodation.categoria && (
              <div className="flex items-center gap-1 mt-1">
                {getCategoryIcon(accommodation.categoria)}
                <span className="text-xs text-[#072357]/60">{accommodation.categoria}</span>
              </div>
            )}
          </div>
          {/* Tipo - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
          {showTypeBadge && accommodation.tipo && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
              {accommodation.tipo}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">

        {/* Dirección */}
        {accommodation.direccion && (
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
            <MapPin className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{accommodation.direccion}</p>
              {accommodation.codigo_postal && (
                <p className="text-[#072357]/50">
                  {accommodation.codigo_postal} {accommodation.municipio_nombre}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Capacidad */}
        {(() => {
          const unidades = accommodation.unidades_alojativas != null ? Number(accommodation.unidades_alojativas) : null;
          const plazas = accommodation.plazas_alojativas != null ? Number(accommodation.plazas_alojativas) : null;
          const hasUnidades = unidades !== null && !isNaN(unidades) && unidades > 0;
          const hasPlazas = plazas !== null && !isNaN(plazas) && plazas > 0;
          
          if (!hasUnidades && !hasPlazas) return null;
          
          return (
            <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-[#072357]/5">
              {hasUnidades && (
                <div className="flex items-center gap-1.5 text-xs text-[#072357]/70">
                  <Home className="w-3.5 h-3.5 text-[#072357]/40" />
                  <span>{formatNumber(unidades)} habitaciones</span>
                </div>
              )}
              {hasPlazas && (
                <div className="flex items-center gap-1.5 text-xs text-[#072357]/70">
                  <Users className="w-3.5 h-3.5 text-[#072357]/40" />
                  <span>{formatNumber(plazas)} plazas</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================================================
// Hospitality Establishment Card
// ============================================================================

function HospitalityCard({ establishment, showTypeBadge = true }: { establishment: HospitalityEstablishment; showTypeBadge?: boolean }) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
              {establishment.nombre}
            </h4>
          </div>
          {/* Tipo - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
          {showTypeBadge && establishment.tipo && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
              {establishment.tipo}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">

        {/* Dirección */}
        {establishment.direccion && (
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
            <MapPin className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{establishment.direccion}</p>
              {establishment.codigo_postal && (
                <p className="text-[#072357]/50">
                  {establishment.codigo_postal} {establishment.municipio_nombre}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Aforo */}
        {(() => {
          const interior = establishment.aforo_interior != null ? Number(establishment.aforo_interior) : null;
          const terraza = establishment.aforo_terraza != null ? Number(establishment.aforo_terraza) : null;
          const hasInterior = interior !== null && !isNaN(interior) && interior > 0;
          const hasTerraza = terraza !== null && !isNaN(terraza) && terraza > 0;
          
          if (!hasInterior && !hasTerraza) return null;
          
          return (
            <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-[#072357]/5">
              {hasInterior && (
                <div className="flex items-center gap-1.5 text-xs text-[#072357]/70">
                  <Building2 className="w-3.5 h-3.5 text-[#072357]/40" />
                  <span>Interior: {formatNumber(interior)}</span>
                </div>
              )}
              {hasTerraza && (
                <div className="flex items-center gap-1.5 text-xs text-[#072357]/70">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#072357]/40" />
                  <span>Terraza: {formatNumber(terraza)}</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ============================================================================
// Tourism Establishment Card
// ============================================================================

function TourismEstablishmentCard({ establishment }: { establishment: TourismEstablishment }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = establishment.latitud && establishment.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${establishment.longitud - 0.002},${establishment.latitud - 0.002},${establishment.longitud + 0.002},${establishment.latitud + 0.002}&layer=mapnik&marker=${establishment.latitud},${establishment.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {establishment.nombre}
              </h4>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {establishment.direccion && (
            <button
              type="button"
              onClick={() => establishment.latitud && establishment.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                establishment.latitud && establishment.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!establishment.latitud || !establishment.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                establishment.latitud && establishment.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  establishment.latitud && establishment.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {establishment.direccion}
                </p>
                {establishment.codigo_postal && (
                  <p className="text-[#072357]/50">
                    {establishment.codigo_postal} {establishment.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(establishment.telefono || establishment.email || establishment.web) && (
            <div className="pt-3 space-y-2.5">
              {establishment.telefono && (
                <a
                  href={`tel:${establishment.telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{establishment.telefono}</span>
                </a>
              )}
              {establishment.email && (
                <a
                  href={`mailto:${establishment.email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{establishment.email}</span>
                </a>
              )}
              {establishment.web && (
                <a
                  href={establishment.web.startsWith('http') ? establishment.web : `https://${establishment.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{establishment.web}</span>
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
                {establishment.nombre}
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
                title={`Mapa de ${establishment.nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {establishment.direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {establishment.direccion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${establishment.latitud},${establishment.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${establishment.latitud}&mlon=${establishment.longitud}&zoom=15`}
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

// ============================================================================
// Tourist Information Office Card
// ============================================================================

function TouristOfficeCard({ office }: { office: TouristInformationOffice }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = office.latitud && office.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${office.longitud - 0.002},${office.latitud - 0.002},${office.longitud + 0.002},${office.latitud + 0.002}&layer=mapnik&marker=${office.latitud},${office.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {office.nombre}
              </h4>
              {office.zona && (
                <p className="text-xs text-[#072357]/50 mt-1">
                  Zona: {office.zona}
                </p>
              )}
            </div>
            {office.estado && (
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                office.estado === 'Abierto'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {office.estado}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Address - Clickable to open map */}
          {office.ubicacion && (
            <button
              type="button"
              onClick={() => office.latitud && office.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                office.latitud && office.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!office.latitud || !office.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                office.latitud && office.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                <p className={`${
                  office.latitud && office.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {office.ubicacion}
                </p>
                {office.codigo_postal && (
                  <p className="text-[#072357]/50">
                    {office.codigo_postal} {office.municipio_nombre}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Horario */}
          {office.horario && (
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70 pt-2 border-t border-[#072357]/5">
              <Calendar className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Horario:</span> {office.horario}
              </div>
            </div>
          )}

          {/* Teléfono */}
          {office.telefono && (
            <a
              href={`tel:${office.telefono.replace(/\s/g, '')}`}
              className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
            >
              <Phone className="w-4 h-4 text-[#072357]/40" />
              <span>{office.telefono}</span>
            </a>
          )}

          {/* Descripción */}
          {office.descripcion && (
            <div className="pt-2 border-t border-[#072357]/5">
              <p className="text-xs sm:text-sm text-[#072357]/70">
                {office.descripcion}
              </p>
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
                {office.nombre}
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
                title={`Mapa de ${office.nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {office.ubicacion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {office.ubicacion}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${office.latitud},${office.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${office.latitud}&mlon=${office.longitud}&zoom=15`}
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

// ============================================================================
// Main Tourism View Component
// ============================================================================

interface V0TourismViewProps {
  ineCode: string;
  municipalityName: string;
  /** Offset desde top para fijar barras 2 y 3 de tabs (solo Turismo) */
  stickyOffsetTop?: number;
}

function EquipmentCard({ equipment, showTypeBadge = true }: { equipment: PublicEquipment; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = equipment.latitud && equipment.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${equipment.longitud - 0.002},${equipment.latitud - 0.002},${equipment.longitud + 0.002},${equipment.latitud + 0.002}&layer=mapnik&marker=${equipment.latitud},${equipment.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {equipment.equipamiento_nombre}
              </h4>
            </div>
            {/* Tipo badge - Solo mostrar cuando showTypeBadge es true, alineado a la derecha */}
            {showTypeBadge && equipment.equipamiento_tipo && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357] shrink-0">
                {equipment.equipamiento_tipo.charAt(0).toUpperCase() + equipment.equipamiento_tipo.slice(1)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
          {/* Espacio natural */}
          {equipment.espacio_natural_nombre && (
            <div className="text-xs sm:text-sm text-[#072357]/70">
              <span className="font-medium text-[#072357]">Espacio natural:</span>{' '}
              <span>{equipment.espacio_natural_nombre}</span>
            </div>
          )}

          {/* Puntos de interés */}
          {equipment.puntos_interes && (
            <div className="text-xs sm:text-sm text-[#072357]/70">
              <span className="font-medium text-[#072357]">Puntos de interés:</span>{' '}
              <span>{equipment.puntos_interes}</span>
            </div>
          )}

          {/* Map button */}
          {equipment.latitud && equipment.longitud && (
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#072357]/5 hover:bg-[#072357]/10 text-xs sm:text-sm text-[#072357] font-medium transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Ver en mapa
            </button>
          )}
        </div>
      </div>

      {/* Map Dialog */}
      {mapUrl && (
        <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
          <DialogContent className="max-w-4xl w-full p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b border-[#072357]/10">
              <DialogTitle className="text-lg font-semibold text-[#072357]">
                {equipment.equipamiento_nombre}
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
                title={`Mapa de ${equipment.equipamiento_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {equipment.espacio_natural_nombre && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {equipment.espacio_natural_nombre}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${equipment.latitud},${equipment.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${equipment.latitud}&mlon=${equipment.longitud}&zoom=15`}
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

export function V0TourismView({ ineCode, municipalityName, stickyOffsetTop }: V0TourismViewProps) {
  const [activeSection, setActiveSection] = useState<'accommodations' | 'hospitality' | 'establishments' | 'offices' | 'equipment'>('accommodations');
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');

  // Igual que referencia: top-0, top-12, top-24 sin hueco (barras pegadas)
  const ROW_H = 48; // h-12
  const isSticky = stickyOffsetTop != null && stickyOffsetTop > 0;
  const bar3Top = isSticky ? stickyOffsetTop + ROW_H : undefined;

  // Accommodations state
  const [allAccommodations, setAllAccommodations] = useState<TouristAccommodation[]>([]);
  const [accommodationsLoading, setAccommodationsLoading] = useState(false);
  
  // Hospitality state
  const [allHospitality, setAllHospitality] = useState<HospitalityEstablishment[]>([]);
  const [hospitalityLoading, setHospitalityLoading] = useState(false);
  
  // Establishments state
  const [allEstablishments, setAllEstablishments] = useState<TourismEstablishment[]>([]);
  const [establishmentsLoading, setEstablishmentsLoading] = useState(false);
  
  // Offices state
  const [allOffices, setAllOffices] = useState<TouristInformationOffice[]>([]);
  const [officesLoading, setOfficesLoading] = useState(false);

  // Equipment state
  const [allEquipment, setAllEquipment] = useState<PublicEquipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // Load accommodations
  useEffect(() => {
    setAccommodationsLoading(true);
    getTouristAccommodationsByIne(ineCode)
      .then((data) => {
        setAllAccommodations(data);
        setAccommodationsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading accommodations:', error);
        setAccommodationsLoading(false);
      });
  }, [ineCode]);

  // Load hospitality
  useEffect(() => {
    setHospitalityLoading(true);
    getHospitalityEstablishmentsByIne(ineCode)
      .then((data) => {
        setAllHospitality(data);
        setHospitalityLoading(false);
      })
      .catch((error) => {
        console.error('Error loading hospitality:', error);
        setHospitalityLoading(false);
      });
  }, [ineCode]);

  // Load establishments
  useEffect(() => {
    setEstablishmentsLoading(true);
    getTourismEstablishmentsByIne(ineCode)
      .then((data) => {
        setAllEstablishments(data);
        setEstablishmentsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading establishments:', error);
        setEstablishmentsLoading(false);
      });
  }, [ineCode]);

  // Load offices
  useEffect(() => {
    setOfficesLoading(true);
    getTouristInformationOfficesByIne(ineCode)
      .then((data) => {
        setAllOffices(data);
        setOfficesLoading(false);
      })
      .catch((error) => {
        console.error('Error loading offices:', error);
        setOfficesLoading(false);
      });
  }, [ineCode]);

  // Load equipment
  useEffect(() => {
    setEquipmentLoading(true);
    getPublicEquipmentByIne(ineCode)
      .then((data) => {
        setAllEquipment(data);
        setEquipmentLoading(false);
      })
      .catch((error) => {
        console.error('Error loading equipment:', error);
        setEquipmentLoading(false);
      });
  }, [ineCode]);

  // Get unique types for accommodations
  const uniqueAccommodationTypes = useMemo(() => {
    const types = new Set<string>();
    allAccommodations.forEach((acc) => {
      if (acc.tipo) {
        types.add(acc.tipo);
      }
    });
    return Array.from(types).sort();
  }, [allAccommodations]);

  // Get unique types for hospitality
  const uniqueHospitalityTypes = useMemo(() => {
    const types = new Set<string>();
    allHospitality.forEach((hosp) => {
      if (hosp.tipo) {
        types.add(hosp.tipo);
      }
    });
    return Array.from(types).sort();
  }, [allHospitality]);

  // Get unique activities for establishments
  const uniqueEstablishmentActivities = useMemo(() => {
    const activities = new Set<string>();
    allEstablishments.forEach((est) => {
      if (est.actividad) {
        activities.add(est.actividad);
      }
    });
    return Array.from(activities).sort();
  }, [allEstablishments]);

  // Get unique equipment types
  const uniqueEquipmentTypes = useMemo(() => {
    const types = new Set<string>();
    allEquipment.forEach((eq) => {
      if (eq.equipamiento_tipo) {
        types.add(eq.equipamiento_tipo);
      }
    });
    return Array.from(types).sort();
  }, [allEquipment]);

  // Count accommodations by type
  const accommodationCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allAccommodations.length };
    allAccommodations.forEach((acc) => {
      const type = acc.tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allAccommodations]);

  // Count hospitality by type
  const hospitalityCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allHospitality.length };
    allHospitality.forEach((hosp) => {
      const type = hosp.tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allHospitality]);

  // Count establishments by activity
  const establishmentCountByActivity = useMemo(() => {
    const counts: Record<string, number> = { all: allEstablishments.length };
    allEstablishments.forEach((est) => {
      const activity = est.actividad || 'Sin tipo';
      counts[activity] = (counts[activity] || 0) + 1;
    });
    return counts;
  }, [allEstablishments]);

  // Count equipment by type
  const equipmentCountByType = useMemo(() => {
    const counts: Record<string, number> = { all: allEquipment.length };
    allEquipment.forEach((eq) => {
      const type = eq.equipamiento_tipo || 'Sin tipo';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [allEquipment]);

  // Filter accommodations
  const filteredAccommodations = useMemo(() => {
    if (activeFilter === 'all') {
      return allAccommodations;
    }
    return allAccommodations.filter((acc) => acc.tipo === activeFilter);
  }, [allAccommodations, activeFilter]);

  // Filter hospitality
  const filteredHospitality = useMemo(() => {
    if (activeFilter === 'all') {
      return allHospitality;
    }
    return allHospitality.filter((hosp) => hosp.tipo === activeFilter);
  }, [allHospitality, activeFilter]);

  // Filter establishments
  const filteredEstablishments = useMemo(() => {
    if (activeFilter === 'all') {
      return allEstablishments;
    }
    return allEstablishments.filter((est) => est.actividad === activeFilter);
  }, [allEstablishments, activeFilter]);

  // Filter equipment
  const filteredEquipment = useMemo(() => {
    if (activeFilter === 'all') {
      return allEquipment;
    }
    return allEquipment.filter((eq) => eq.equipamiento_tipo === activeFilter);
  }, [allEquipment, activeFilter]);

  // Reset filter when switching sections
  useEffect(() => {
    setActiveFilter('all');
  }, [activeSection]);

  const isLoading = 
    activeSection === 'accommodations' ? accommodationsLoading :
    activeSection === 'hospitality' ? hospitalityLoading :
    activeSection === 'establishments' ? establishmentsLoading :
    activeSection === 'equipment' ? equipmentLoading :
    officesLoading;

  const uniqueTypes = 
    activeSection === 'accommodations' ? uniqueAccommodationTypes :
    activeSection === 'hospitality' ? uniqueHospitalityTypes :
    activeSection === 'establishments' ? uniqueEstablishmentActivities :
    activeSection === 'equipment' ? uniqueEquipmentTypes :
    [];

  const countByType = 
    activeSection === 'accommodations' ? accommodationCountByType :
    activeSection === 'hospitality' ? hospitalityCountByType :
    activeSection === 'establishments' ? establishmentCountByActivity :
    activeSection === 'equipment' ? equipmentCountByType :
    {};

  const loading = accommodationsLoading || hospitalityLoading || establishmentsLoading || officesLoading || equipmentLoading;
  const showAccommodationsTab = !accommodationsLoading && allAccommodations.length > 0;
  const showHospitalityTab = !hospitalityLoading && allHospitality.length > 0;
  const showEstablishmentsTab = !establishmentsLoading && allEstablishments.length > 0;
  const showOfficesTab = !officesLoading && allOffices.length > 0;
  const showEquipmentTab = !equipmentLoading && allEquipment.length > 0;
  const hasAnyTab = showAccommodationsTab || showHospitalityTab || showEstablishmentsTab || showOfficesTab || showEquipmentTab;

  useEffect(() => {
    if (loading || !hasAnyTab) return;
    const isCurrentVisible =
      (activeSection === 'accommodations' && showAccommodationsTab) ||
      (activeSection === 'hospitality' && showHospitalityTab) ||
      (activeSection === 'establishments' && showEstablishmentsTab) ||
      (activeSection === 'offices' && showOfficesTab) ||
      (activeSection === 'equipment' && showEquipmentTab);
    if (!isCurrentVisible) {
      if (showAccommodationsTab) setActiveSection('accommodations');
      else if (showHospitalityTab) setActiveSection('hospitality');
      else if (showEstablishmentsTab) setActiveSection('establishments');
      else if (showOfficesTab) setActiveSection('offices');
      else if (showEquipmentTab) setActiveSection('equipment');
      setActiveFilter('all');
    }
  }, [loading, hasAnyTab, activeSection, showAccommodationsTab, showHospitalityTab, showEstablishmentsTab, showOfficesTab, showEquipmentTab]);

  return (
    <div className="space-y-0">
      {/* Barra 2: sticky top = stickyOffsetTop, h-12 (pegada a barra 1, como referencia) */}
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
            {loading ? (
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
                {showAccommodationsTab && (
              <button
                type="button"
                onClick={() => setActiveSection('accommodations')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'accommodations'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Alojamientos
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'accommodations'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allAccommodations.length}
                </span>
              </button>
                )}
                {showHospitalityTab && (
              <button
                type="button"
                onClick={() => setActiveSection('hospitality')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'hospitality'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Hostelería
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'hospitality'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allHospitality.length}
                </span>
              </button>
                )}
                {showEstablishmentsTab && (
              <button
                type="button"
                onClick={() => setActiveSection('establishments')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'establishments'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Otros
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'establishments'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allEstablishments.length}
                </span>
              </button>
                )}
                {showOfficesTab && (
              <button
                type="button"
                onClick={() => setActiveSection('offices')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'offices'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Oficinas de turismo
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'offices'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allOffices.length}
                </span>
              </button>
                )}
                {showEquipmentTab && (
              <button
                type="button"
                onClick={() => setActiveSection('equipment')}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'equipment'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Equipamientos
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'equipment'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allEquipment.length}
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
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay datos de turismo en este municipio</p>
        </div>
      )}

      {/* Barra 3: sticky, h-12, sin línea de separación (como referencia) */}
      {hasAnyTab && activeSection !== 'offices' && (
        <div
          className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
          style={
            bar3Top != null
              ? { position: 'sticky', top: bar3Top, zIndex: 10, backgroundColor: '#f5f8fa' }
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
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

      {/* Contenido con máscara de degradado para que no se vea por detrás de los tabs (como referencia) */}
      {hasAnyTab && (
        <div className="relative">
          {(isLoading ? (
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
      ) : activeSection === 'accommodations' ? (
        filteredAccommodations.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredAccommodations.map((acc) => (
              <AccommodationCard 
                key={acc.id} 
                accommodation={acc} 
                showTypeBadge={activeFilter === 'all'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            <Home className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay alojamientos turísticos de este tipo en el municipio</p>
          </div>
        )
      ) : activeSection === 'hospitality' ? (
        filteredHospitality.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredHospitality.map((hosp) => (
              <HospitalityCard 
                key={hosp.id} 
                establishment={hosp} 
                showTypeBadge={activeFilter === 'all'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay establecimientos de hostelería de este tipo en el municipio</p>
          </div>
        )
      ) : activeSection === 'establishments' ? (
        filteredEstablishments.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filteredEstablishments.map((est) => (
              <TourismEstablishmentCard key={est.id} establishment={est} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay establecimientos turísticos de este tipo en el municipio</p>
          </div>
        )
      ) : activeSection === 'offices' ? (
        allOffices.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {allOffices.map((office) => (
              <TouristOfficeCard key={office.id} office={office} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#072357]/50">
            <Info className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay oficinas de información turística en el municipio</p>
          </div>
        )
      ) : filteredEquipment.length > 0 ? (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {filteredEquipment.map((equipment) => (
            <EquipmentCard 
              key={equipment.id} 
              equipment={equipment} 
              showTypeBadge={activeFilter === 'all'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-[#072357]/50">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay equipamientos de este tipo en el municipio</p>
        </div>
      ))}
        </div>
      )}
    </div>
  );
}
