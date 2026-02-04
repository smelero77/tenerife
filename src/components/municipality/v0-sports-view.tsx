'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  Calendar,
  Building2,
  Activity,
  Trophy,
} from 'lucide-react';
import {
  SportsInstallation,
  SportsCenter,
  SportsEvent,
  getSportsInstallationsByIne,
  getSportsCentersByIne,
  getSportsEventsByIne,
  getInstallationTypes,
  getSportsCenterTypes,
} from '@/lib/queries/sports';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ============================================================================
// Sports Installation Card
// ============================================================================

function InstallationCard({ installation, showTypeBadge = true }: { installation: SportsInstallation; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSpacesModalOpen, setIsSpacesModalOpen] = useState(false);

  const mapUrl = installation.latitud && installation.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${installation.longitud - 0.002},${installation.latitud - 0.002},${installation.longitud + 0.002},${installation.latitud + 0.002}&layer=mapnik&marker=${installation.latitud},${installation.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {installation.instalacion_nombre}
              </h4>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5 flex-1 flex flex-col">
          {/* Address - Clickable to open map */}
          {(installation.codigo_postal || installation.latitud) && (
            <button
              type="button"
              onClick={() => installation.latitud && installation.longitud && setIsMapOpen(true)}
              className={`w-full flex items-start gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                installation.latitud && installation.longitud
                  ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                  : 'cursor-default'
              }`}
              disabled={!installation.latitud || !installation.longitud}
            >
              <MapPin className={`w-4 h-4 shrink-0 mt-0.5 transition-colors ${
                installation.latitud && installation.longitud
                  ? 'text-[#0066cc] group-hover:text-[#072357]'
                  : 'text-[#072357]/40'
              }`} />
              <div className="text-xs sm:text-sm text-[#072357]/70 flex-1">
                {installation.codigo_postal && (
                  <p className={`${
                    installation.latitud && installation.longitud
                      ? 'group-hover:text-[#0066cc] transition-colors'
                      : ''
                  }`}>
                    Código postal: {installation.codigo_postal}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Propiedad y Gestión - Solo mostrar cuando showTypeBadge es true */}
          {showTypeBadge && (installation.propiedad || installation.tipo_gestion) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#072357]/5">
              {installation.propiedad && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357]">
                  {installation.propiedad}
                </span>
              )}
              {installation.tipo_gestion && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357]">
                  {installation.tipo_gestion}
                </span>
              )}
            </div>
          )}

          {/* Espacios Deportivos - Solo mostrar título clickeable */}
          {installation.espacios_deportivos && installation.espacios_deportivos.length > 0 && (
            <div className="pt-2 border-t border-[#072357]/5">
              <button
                type="button"
                onClick={() => setIsSpacesModalOpen(true)}
                className="w-full text-left text-xs font-medium text-[#0066cc] hover:text-[#072357] hover:underline transition-colors"
              >
                Espacios deportivos ({installation.espacios_deportivos.length})
              </button>
            </div>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(installation.telefono_fijo || installation.email || installation.web) && (
            <div className="pt-3 space-y-2.5 mt-auto">
              {installation.telefono_fijo && (
                <a
                  href={`tel:${installation.telefono_fijo.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{installation.telefono_fijo}</span>
                </a>
              )}
              {installation.email && (
                <a
                  href={`mailto:${installation.email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{installation.email}</span>
                </a>
              )}
              {installation.web && (
                <a
                  href={installation.web.startsWith('http') ? installation.web : `https://${installation.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{installation.web}</span>
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
                {installation.instalacion_nombre}
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
                title={`Mapa de ${installation.instalacion_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {installation.codigo_postal && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {installation.codigo_postal}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://www.google.com/maps?q=${installation.latitud},${installation.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0066cc] hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-[#072357]/30">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${installation.latitud}&mlon=${installation.longitud}&zoom=15`}
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

      {/* Spaces Modal */}
      {installation.espacios_deportivos && installation.espacios_deportivos.length > 0 && (
        <Dialog open={isSpacesModalOpen} onOpenChange={setIsSpacesModalOpen}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
              <DialogTitle className="text-sm sm:text-base font-semibold text-[#072357]">
                Espacios Deportivos
              </DialogTitle>
              <p className="text-xs sm:text-sm text-[#072357]/70 mt-1">
                {installation.instalacion_nombre}
              </p>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              <div className="space-y-3 sm:space-y-4">
                {installation.espacios_deportivos.map((space) => (
                  <div
                    key={space.id}
                    className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                      <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                        {space.espacio_nombre}
                      </h4>
                      {space.espacio_codigo && (
                        <p className="text-xs text-[#072357]/50 mt-1">
                          Código: {space.espacio_codigo}
                        </p>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
                      {space.espacio_tipo && (
                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                          <span className="font-medium text-[#072357]">Tipo:</span>
                          <span>{space.espacio_tipo}</span>
                        </div>
                      )}
                      {space.espacio_clase && (
                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                          <span className="font-medium text-[#072357]">Clase:</span>
                          <span>{space.espacio_clase}</span>
                        </div>
                      )}
                      {space.pavimento_tipo && (
                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                          <span className="font-medium text-[#072357]">Pavimento:</span>
                          <span>{space.pavimento_tipo}</span>
                        </div>
                      )}
                      {space.espacio_cerramiento && (
                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                          <span className="font-medium text-[#072357]">Cerramiento:</span>
                          <span>{space.espacio_cerramiento}</span>
                        </div>
                      )}
                      {space.espacio_estado_uso && (
                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                          <span className="font-medium text-[#072357]">Estado de uso:</span>
                          <span>{space.espacio_estado_uso}</span>
                        </div>
                      )}
                      {space.espacio_iluminacion && (
                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                          <span className="font-medium text-[#072357]">Iluminación:</span>
                          <span>{space.espacio_iluminacion}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ============================================================================
// Sports Center Card
// ============================================================================

function SportsCenterCard({ center, showTypeBadge = true }: { center: SportsCenter; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const mapUrl = center.latitud && center.longitud
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${center.longitud - 0.002},${center.latitud - 0.002},${center.longitud + 0.002},${center.latitud + 0.002}&layer=mapnik&marker=${center.latitud},${center.longitud}&zoom=17`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden h-full flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                {center.centro_nombre}
              </h4>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5 flex-1 flex flex-col">
          {/* Address - Clickable to open map */}
          {center.centro_direccion && (
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
                  {center.centro_direccion}
                </p>
                {center.centro_codigo_postal && (
                  <p className="text-[#072357]/50">
                    {center.centro_codigo_postal}
                  </p>
                )}
              </div>
            </button>
          )}

          {/* Tipo y Actividad - Solo mostrar cuando showTypeBadge es true */}
          {showTypeBadge && (center.centro_tipo || center.centro_actividad) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#072357]/5">
              {center.centro_tipo && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357]">
                  {center.centro_tipo}
                </span>
              )}
              {center.centro_actividad && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#072357]/10 text-[#072357]">
                  {center.centro_actividad}
                </span>
              )}
            </div>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(center.centro_telefono || center.centro_email || center.centro_web) && (
            <div className="pt-3 space-y-2.5 mt-auto">
              {center.centro_telefono && (
                <a
                  href={`tel:${center.centro_telefono.replace(/\s/g, '')}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Phone className="w-4 h-4 text-[#072357]/40" />
                  <span>{center.centro_telefono}</span>
                </a>
              )}
              {center.centro_email && (
                <a
                  href={`mailto:${center.centro_email}`}
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#072357]/40" />
                  <span>{center.centro_email}</span>
                </a>
              )}
              {center.centro_web && (
                <a
                  href={center.centro_web.startsWith('http') ? center.centro_web : `https://${center.centro_web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#072357]/40" />
                  <span className="truncate">{center.centro_web}</span>
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
                {center.centro_nombre}
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
                title={`Mapa de ${center.centro_nombre}`}
              />
            </div>
            <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#072357]/5 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-[#072357]/60">
                {center.centro_direccion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {center.centro_direccion}
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

// ============================================================================
// Sports Event Card
// ============================================================================

function SportsEventCard({ event }: { event: SportsEvent }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysUntilEvent = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilEvent(event.evento_fecha_inicio);
  const daysText =
    daysUntil === 0
      ? 'Hoy'
      : daysUntil === 1
      ? 'Mañana'
      : `En ${daysUntil} días`;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
              {event.evento_nombre}
            </h4>
          </div>
          {daysUntil < 10 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm animate-pulse">
              <Trophy className="w-3 h-3" />
              Empieza pronto
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5 flex-1 flex flex-col">
        {/* Fechas */}
        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
          <Calendar className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>
              <span className="font-medium">Inicio:</span> {formatDate(event.evento_fecha_inicio)} {formatTime(event.evento_fecha_inicio)}
            </p>
            {event.evento_fecha_fin && (
              <p className="mt-1">
                <span className="font-medium">Fin:</span> {formatDate(event.evento_fecha_fin)} {formatTime(event.evento_fecha_fin)}
              </p>
            )}
            <p className="mt-1 text-[#072357]/60">
              {daysText}
            </p>
          </div>
        </div>

        {/* Lugar */}
        {event.evento_lugar && (
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70 pt-2 border-t border-[#072357]/5">
            <MapPin className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Lugar:</span> {event.evento_lugar}
            </div>
          </div>
        )}

        {/* Organizador */}
        {event.evento_organizador && (
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70 pt-2 border-t border-[#072357]/5">
            <Building2 className="w-4 h-4 text-[#072357]/40 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Organizador:</span> {event.evento_organizador}
            </div>
          </div>
        )}

        {/* Descripción */}
        {event.evento_descripcion && (
          <div className="pt-2 border-t border-[#072357]/5">
            <p className="text-xs sm:text-sm text-[#072357]/70">
              {event.evento_descripcion}
            </p>
          </div>
        )}

        {/* URL */}
        {event.evento_url && (
          <div className="pt-2 border-t border-[#072357]/5 mt-auto">
            <a
              href={event.evento_url.startsWith('http') ? event.evento_url : `https://${event.evento_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-xs sm:text-sm text-[#072357] hover:text-[#0066cc] transition-colors"
            >
              <Globe className="w-4 h-4 text-[#072357]/40" />
              <span className="truncate">Más información</span>
              <ExternalLink className="w-3 h-3 text-[#072357]/40 shrink-0" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface V0SportsViewProps {
  ineCode: string;
  municipalityName: string;
}

export function V0SportsView({ ineCode, municipalityName }: V0SportsViewProps) {
  const [activeSection, setActiveSection] = useState<'installations' | 'centers' | 'events'>('installations');
  const [activeFilter, setActiveFilter] = useState<string | 'all'>('all');
  
  // Installations state
  const [allInstallations, setAllInstallations] = useState<SportsInstallation[]>([]);
  const [installationsLoading, setInstallationsLoading] = useState(false);
  const [installationTypes, setInstallationTypes] = useState<string[]>([]);
  
  // Centers state
  const [allCenters, setAllCenters] = useState<SportsCenter[]>([]);
  const [centersLoading, setCentersLoading] = useState(false);
  const [centerTypes, setCenterTypes] = useState<string[]>([]);
  
  // Events state
  const [allEvents, setAllEvents] = useState<SportsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Load installations
  useEffect(() => {
    setInstallationsLoading(true);
    getSportsInstallationsByIne(ineCode)
      .then((data) => {
        setAllInstallations(data);
        setInstallationsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading sports installations:', error);
        setInstallationsLoading(false);
      });
  }, [ineCode]);

  // Load installation types
  useEffect(() => {
    getInstallationTypes()
      .then((types) => {
        setInstallationTypes(types);
      })
      .catch((error) => {
        console.error('Error loading installation types:', error);
      });
  }, []);

  // Load centers
  useEffect(() => {
    setCentersLoading(true);
    getSportsCentersByIne(ineCode)
      .then((data) => {
        setAllCenters(data);
        setCentersLoading(false);
      })
      .catch((error) => {
        console.error('Error loading sports centers:', error);
        setCentersLoading(false);
      });
  }, [ineCode]);

  // Load center types
  useEffect(() => {
    getSportsCenterTypes()
      .then((types) => {
        setCenterTypes(types);
      })
      .catch((error) => {
        console.error('Error loading center types:', error);
      });
  }, []);

  // Load events
  useEffect(() => {
    setEventsLoading(true);
    getSportsEventsByIne(ineCode)
      .then((data) => {
        setAllEvents(data);
        setEventsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading sports events:', error);
        setEventsLoading(false);
      });
  }, [ineCode]);

  // Filter installations by tipo_gestion
  const filteredInstallations = useMemo(() => {
    if (activeFilter === 'all') {
      return allInstallations;
    }
    return allInstallations.filter(
      (inst) => inst.tipo_gestion === activeFilter
    );
  }, [allInstallations, activeFilter]);

  // Filter centers by tipo
  const filteredCenters = useMemo(() => {
    if (activeFilter === 'all') {
      return allCenters;
    }
    return allCenters.filter((center) => center.centro_tipo === activeFilter);
  }, [allCenters, activeFilter]);

  // Get unique installation types from current data
  const uniqueInstallationTypes = useMemo(() => {
    const types = new Set<string>();
    allInstallations.forEach((inst) => {
      if (inst.tipo_gestion) {
        types.add(inst.tipo_gestion);
      }
    });
    return Array.from(types).sort();
  }, [allInstallations]);

  // Get unique center types from current data
  const uniqueCenterTypes = useMemo(() => {
    const types = new Set<string>();
    allCenters.forEach((center) => {
      if (center.centro_tipo) {
        types.add(center.centro_tipo);
      }
    });
    return Array.from(types).sort();
  }, [allCenters]);

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="relative -mx-4 sm:-mx-6">
        {/* Fade indicator on right to show more content */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
        
        <div 
          className="flex gap-2 overflow-x-auto pb-1 px-4 sm:px-6"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          {(installationsLoading || centersLoading || eventsLoading) ? (
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
              <button
                onClick={() => {
                  setActiveSection('installations');
                  setActiveFilter('all');
                }}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'installations'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Instalaciones
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'installations'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allInstallations.length}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveSection('centers');
                  setActiveFilter('all');
                }}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'centers'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Centros
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
              <button
                onClick={() => {
                  setActiveSection('events');
                  setActiveFilter('all');
                }}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  activeSection === 'events'
                    ? 'bg-[#072357] text-white'
                    : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Eventos
                <span 
                  className={`min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] flex items-center justify-center rounded-full text-[10px] sm:text-xs font-bold ${
                    activeSection === 'events'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#072357]/10 text-[#072357]'
                  }`}
                >
                  {allEvents.length}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Installations Section */}
      {activeSection === 'installations' && (
        <div className="space-y-4">
          {/* Dynamic Filter Tabs */}
          {installationsLoading ? (
            <div className="relative -mx-4 sm:-mx-6">
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              <div 
                className="flex gap-2 overflow-x-auto pb-1 px-4 sm:px-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-9 sm:h-10 w-24 sm:w-28 rounded-full shrink-0"
                  />
                ))}
              </div>
            </div>
          ) : uniqueInstallationTypes.length > 0 ? (
            <div className="relative -mx-4 sm:-mx-6">
              {/* Fade indicator on right to show more content */}
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              
              <div 
                className="flex gap-2 overflow-x-auto pb-1 px-4 sm:px-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                    activeFilter === 'all'
                      ? 'bg-[#072357] text-white'
                      : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                  }`}
                >
                  Todos
                </button>
                {uniqueInstallationTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(type)}
                    className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                      activeFilter === type
                        ? 'bg-[#072357] text-white'
                        : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Installations Grid */}
          {installationsLoading ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
                >
                  <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                    <Skeleton className="h-4 sm:h-5 w-3/4" />
                  </div>
                  <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
                    <Skeleton className="h-3 sm:h-3.5 w-full" />
                    <Skeleton className="h-3 sm:h-3.5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInstallations.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {filteredInstallations.map((installation) => (
                <InstallationCard 
                  key={installation.id} 
                  installation={installation} 
                  showTypeBadge={activeFilter === 'all'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#072357]/50">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay instalaciones deportivas en el municipio</p>
            </div>
          )}
        </div>
      )}

      {/* Centers Section */}
      {activeSection === 'centers' && (
        <div className="space-y-4">
          {/* Dynamic Filter Tabs */}
          {centersLoading ? (
            <div className="relative -mx-4 sm:-mx-6">
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              <div 
                className="flex gap-2 overflow-x-auto pb-1 px-4 sm:px-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-9 sm:h-10 w-24 sm:w-28 rounded-full shrink-0"
                  />
                ))}
              </div>
            </div>
          ) : uniqueCenterTypes.length > 0 ? (
            <div className="relative -mx-4 sm:-mx-6">
              {/* Fade indicator on right to show more content */}
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              
              <div 
                className="flex gap-2 overflow-x-auto pb-1 px-4 sm:px-6"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                    activeFilter === 'all'
                      ? 'bg-[#072357] text-white'
                      : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                  }`}
                >
                  Todos
                </button>
                {uniqueCenterTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(type)}
                    className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                      activeFilter === type
                        ? 'bg-[#072357] text-white'
                        : 'bg-white border border-[#072357]/10 text-[#072357]/70 active:bg-[#072357]/5'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Centers Grid */}
          {centersLoading ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
                >
                  <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                    <Skeleton className="h-4 sm:h-5 w-3/4" />
                  </div>
                  <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
                    <Skeleton className="h-3 sm:h-3.5 w-full" />
                    <Skeleton className="h-3 sm:h-3.5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCenters.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {filteredCenters.map((center) => (
                <SportsCenterCard 
                  key={center.id} 
                  center={center} 
                  showTypeBadge={activeFilter === 'all'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#072357]/50">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay centros deportivos en el municipio</p>
            </div>
          )}
        </div>
      )}

      {/* Events Section */}
      {activeSection === 'events' && (
        <div className="space-y-4">
          {eventsLoading ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
                >
                  <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                    <Skeleton className="h-4 sm:h-5 w-3/4" />
                  </div>
                  <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
                    <Skeleton className="h-3 sm:h-3.5 w-full" />
                    <Skeleton className="h-3 sm:h-3.5 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : allEvents.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {allEvents.map((event) => (
                <SportsEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#072357]/50">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay eventos deportivos programados en el municipio</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
