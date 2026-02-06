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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SportsInstallation,
  SportsCenter,
  SportsEvent,
  SportsSpace,
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
// Helpers: Espacios – vista ciudadana (resumen, modalidades, complementarios)
// ============================================================================

/** Limpia texto mostrado al usuario: espacios múltiples y duplicaciones evidentes. No modifica datos origen. */
function cleanDisplayText(s: string): string {
  if (!s?.trim()) return s || '';
  let t = s.trim().replace(/\s+/g, ' ');
  t = t.replace(/vestuarioss/gi, 'vestuarios');
  t = t.replace(/públicoss/gi, 'públicos');
  t = t.replace(/aseoss/gi, 'aseos');
  t = t.replace(/almaceness/gi, 'almacenes');
  return t;
}

function isPracticeSpace(space: SportsSpace): boolean {
  const clase = (space.espacio_clase || '').toLowerCase();
  return !clase.includes('otros espacios complementarios');
}

function getModalidad(space: SportsSpace): string {
  const sec = space.caracteristicas?.find(
    (c) => (c.categoria || '').toLowerCase().includes('actividad') && (c.categoria || '').toLowerCase().includes('secundaria')
  );
  if (sec?.caracteristica?.trim()) return sec.caracteristica.trim();
  if (space.espacio_actividad_principal?.trim()) return space.espacio_actividad_principal.trim();
  const nombre = (space.espacio_nombre || '').toLowerCase();
  if (nombre.includes('bola canaria')) return 'Bola canaria';
  if (nombre.includes('petanca')) return 'Petanca';
  if (nombre.includes('fútbol') || nombre.includes('futbol')) return 'Fútbol';
  if (nombre.includes('vestuario') || nombre.includes('almacén') || nombre.includes('almacen')) return 'Complementario';
  return 'Otros espacios deportivos';
}

function allowsNightUse(iluminacion: string | undefined): boolean {
  if (!iluminacion?.trim()) return false;
  const t = iluminacion.toLowerCase().replace(/\s+/g, ' ');
  return t.includes('permite') && (t.includes('nocturno') || t.includes('nocturnno'));
}

function isEnclosed(cerramiento: string | undefined): boolean {
  return (cerramiento || '').toLowerCase().includes('recinto cerrado');
}

/** Convierte el tipo de pavimento técnico a lenguaje humano breve. */
function pavimentoToHuman(pavimento: string | null | undefined): string {
  if (!pavimento?.trim()) return '';
  const t = pavimento.toLowerCase().trim();
  if (t.includes('hierba artificial')) return 'hierba artificial';
  if (t.includes('hierba natural')) return 'hierba natural';
  if (t.includes('parquet')) return 'parquet';
  if (t.includes('asfalto')) return 'asfalto';
  if (t.includes('terrazo')) return 'terrazo';
  if (t.includes('hormigón')) return 'hormigón';
  if (t.includes('tierra')) return 'tierra';
  if (t.includes('arena')) return 'arena';
  if (t.includes('cemento')) return 'cemento';
  if (t.includes('tatami')) return 'tatami';
  if (t.includes('tartán')) return 'tartán';
  if (t.includes('moqueta')) return 'moqueta';
  if (t.includes('sintético')) return 'sintético';
  if (t.includes('caucho')) return 'caucho';
  if (t.includes('madera')) return 'madera';
  if (t.includes('sintéticos')) return 'sintético';
  if (t.includes('naturales')) return 'natural';
  return pavimento.length > 30 ? t.slice(0, 30) + '…' : pavimento;
}

function buildSpacesSummary(installation: SportsInstallation) {
  const deportivos = installation.espacios_deportivos || [];
  const complementarios = installation.espacios_complementarios || [];
  const practiceSpaces = deportivos.filter(isPracticeSpace);

  const modalidadesSet = new Set<string>();
  practiceSpaces.forEach((s) => {
    const m = getModalidad(s);
    if (m !== 'Complementario') modalidadesSet.add(m);
  });
  const modalidadesCount = modalidadesSet.size;
  const zonasCount = practiceSpaces.length;
  const compCount = complementarios.length;

  let usoNocturno: 'disponible' | 'disponible_en_parte' | 'no_disponible' | 'no_informado' = 'no_informado';
  if (practiceSpaces.length > 0) {
    const conNocturno = practiceSpaces.filter((s) => allowsNightUse(s.espacio_iluminacion));
    if (conNocturno.length === practiceSpaces.length) usoNocturno = 'disponible';
    else if (conNocturno.length > 0) usoNocturno = 'disponible_en_parte';
    else {
      const sinNocturno = practiceSpaces.filter((s) => s.espacio_iluminacion && (s.espacio_iluminacion || '').toLowerCase().includes('no permite'));
      if (sinNocturno.length === practiceSpaces.length) usoNocturno = 'no_disponible';
    }
  }

  let recintoCerrado: 'sí' | 'mixto' | 'no' | 'no_informado' = 'no_informado';
  if (practiceSpaces.length > 0) {
    const conCerrado = practiceSpaces.filter((s) => isEnclosed(s.espacio_cerramiento));
    const abierto = practiceSpaces.filter((s) => (s.espacio_cerramiento || '').toLowerCase().includes('abierto'));
    if (conCerrado.length === practiceSpaces.length) recintoCerrado = 'sí';
    else if (abierto.length === practiceSpaces.length) recintoCerrado = 'no';
    else if (conCerrado.length > 0 || abierto.length > 0) recintoCerrado = 'mixto';
  }

  const byModalidad = new Map<string, SportsSpace[]>();
  practiceSpaces.forEach((s) => {
    const m = getModalidad(s);
    if (m === 'Complementario') return;
    if (!byModalidad.has(m)) byModalidad.set(m, []);
    byModalidad.get(m)!.push(s);
  });

  const compByTipo = new Map<string, number>();
  complementarios.forEach((c) => {
    const tipo = (c.espacio_complementario_tipo || 'Otros').trim();
    compByTipo.set(tipo, (compByTipo.get(tipo) || 0) + 1);
  });

  const allSpacesNocturno = practiceSpaces.length > 0 && practiceSpaces.every((s) => allowsNightUse(s.espacio_iluminacion));
  const allSpacesEnclosed = practiceSpaces.length > 0 && practiceSpaces.every((s) => isEnclosed(s.espacio_cerramiento));

  const summaryParts: string[] = [];
  if (modalidadesCount > 0 && zonasCount > 0) {
    const zonaLabel = zonasCount !== 1 ? 'zonas de práctica' : 'zona de práctica';
    if (modalidadesCount > 1) {
      summaryParts.push(`El complejo dispone de **${zonasCount}** **${zonaLabel}** en **${modalidadesCount}** **modalidades deportivas**.`);
    } else {
      summaryParts.push(`El complejo dispone de **${zonasCount}** **${zonaLabel}**.`);
    }
  }
  if (usoNocturno === 'disponible') {
    summaryParts.push('**Uso nocturno disponible** en todo el complejo.');
  } else if (usoNocturno === 'disponible_en_parte') {
    summaryParts.push('**Uso nocturno disponible** en parte del complejo.');
  }
  if (recintoCerrado === 'sí') {
    summaryParts.push('**Recinto cerrado.**');
  } else if (recintoCerrado === 'mixto') {
    summaryParts.push('El complejo combina espacios cerrados y al aire libre.');
  }
  if (compCount > 0) {
    summaryParts.push(`Cuenta con **${compCount}** **espacios complementarios** de apoyo a la actividad.`);
  }

  const summaryTextWithBold = summaryParts.join(' ');

  return {
    practiceSpaces,
    complementarios,
    modalidadesCount,
    zonasCount,
    compCount,
    usoNocturno,
    recintoCerrado,
    allSpacesNocturno,
    allSpacesEnclosed,
    byModalidad: Array.from(byModalidad.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    compByTipo,
    summaryTextWithBold,
  };
}

/** Renderiza un texto con marcadores ** en negrita; respeta espacios. */
function renderSummaryWithBold(text: string) {
  const cleaned = cleanDisplayText(text);
  const parts = cleaned.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-[#072357]">
        {part}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/** Conteo de espacios complementarios en lenguaje humano con marcadores ** para negrita (números). */
function formatComplementariosCountHuman(compByTipo: Map<string, number>): string {
  const items: string[] = [];
  const tipoOrder = ['Almacén deportivo', 'Vestuarios', 'Aseos públicos'];
  const rest = new Map(compByTipo);
  tipoOrder.forEach((tipo) => {
    const n = rest.get(tipo);
    if (n == null) return;
    rest.delete(tipo);
    const t = tipo.toLowerCase();
    let label = t;
    if (t === 'vestuarios') label = n === 1 ? 'vestuario' : 'vestuarios';
    else if (t === 'aseos públicos') label = n === 1 ? 'aseo público' : 'aseos públicos';
    else if (t === 'almacén deportivo') label = n === 1 ? 'almacén deportivo' : 'almacenes deportivos';
    items.push(`**${n}** **${label}**`);
  });
  rest.forEach((n, tipo) => {
    const label = tipo.toLowerCase();
    items.push(`**${n}** **${label}**`);
  });
  if (items.length === 0) return '';
  if (items.length === 1) return items[0] + '.';
  return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1] + '.';
}

// ============================================================================
// Sports Installation Card
// ============================================================================

function InstallationCard({ installation, showTypeBadge = true }: { installation: SportsInstallation; showTypeBadge?: boolean }) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isSpacesModalOpen, setIsSpacesModalOpen] = useState(false);
  const [showTechnicalSheet, setShowTechnicalSheet] = useState(false);

  const spacesSummary = useMemo(() => buildSpacesSummary(installation), [installation]);

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
          {/* Address - Clickable to open map; line always below this block */}
          {(installation.codigo_postal || installation.latitud) && (
            <div className="pb-2.5 border-b border-[#072357]/5">
              <button
                type="button"
                onClick={() => installation.latitud && installation.longitud && setIsMapOpen(true)}
                className={`w-full flex items-center gap-2.5 text-left rounded-lg p-2 -m-2 transition-all ${
                  installation.latitud && installation.longitud
                    ? 'hover:bg-[#072357]/5 hover:shadow-sm active:bg-[#072357]/10 cursor-pointer group'
                    : 'cursor-default'
                }`}
                disabled={!installation.latitud || !installation.longitud}
              >
                <MapPin className={`w-4 h-4 shrink-0 transition-colors ${
                  installation.latitud && installation.longitud
                    ? 'text-[#0066cc] group-hover:text-[#072357]'
                    : 'text-[#072357]/40'
                }`} />
                <span className={`text-xs sm:text-sm text-[#072357]/70 flex-1 ${
                  installation.latitud && installation.longitud
                    ? 'group-hover:text-[#0066cc] transition-colors'
                    : ''
                }`}>
                  {installation.codigo_postal ? `Código postal: ${installation.codigo_postal}` : 'Ver en mapa'}
                </span>
              </button>
            </div>
          )}

          {/* Propiedad y Gestión - Solo mostrar cuando showTypeBadge es true (sin border-t; la línea va en el bloque de dirección) */}
          {showTypeBadge && (installation.propiedad || installation.tipo_gestion) && (
            <div className="flex flex-wrap gap-2 pt-2.5">
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

          {/* Características de la instalación */}
          {installation.caracteristicas && installation.caracteristicas.length > 0 && (
            <div className="pt-2.5 mt-0.5 border-t border-[#072357]/5">
              <div className="space-y-2">
                {Object.entries(
                  installation.caracteristicas.reduce((acc, char) => {
                    const key = char.categoria;
                    if (!acc[key]) acc[key] = new Set<string>();
                    acc[key].add(char.caracteristica);
                    return acc;
                  }, {} as Record<string, Set<string>>)
                ).map(([categoria, caracteristicasSet]) => (
                  <div key={categoria} className="text-xs sm:text-sm text-[#072357]/70">
                    <span className="font-medium text-[#072357]">{categoria}:</span>{' '}
                    <span>
                      {Array.from(caracteristicasSet).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Espacios Deportivos y Complementarios - Solo mostrar título clickeable */}
          {((installation.espacios_deportivos && installation.espacios_deportivos.length > 0) ||
            (installation.espacios_complementarios && installation.espacios_complementarios.length > 0)) && (
            <div className="pt-2.5 mt-0.5 border-t border-[#072357]/5">
              <button
                type="button"
                onClick={() => setIsSpacesModalOpen(true)}
                className="w-full text-left text-xs font-medium text-[#0066cc] hover:text-[#072357] hover:underline transition-colors"
              >
                {installation.espacios_deportivos && installation.espacios_deportivos.length > 0 && (
                  <>Espacios deportivos ({installation.espacios_deportivos.length})</>
                )}
                {installation.espacios_deportivos && installation.espacios_deportivos.length > 0 &&
                  installation.espacios_complementarios && installation.espacios_complementarios.length > 0 && (
                    <> · </>
                  )}
                {installation.espacios_complementarios && installation.espacios_complementarios.length > 0 && (
                  <>Espacios complementarios ({installation.espacios_complementarios.length})</>
                )}
              </button>
            </div>
          )}

          {/* Contact info - Phone, Email, Web */}
          {(installation.telefono_fijo || installation.email || installation.web) && (
            <div className="pt-2.5 border-t border-[#072357]/5 space-y-2.5 mt-auto">
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

      {/* Spaces Modal - mismo estilo que sheet de municipio/localidad */}
      {((installation.espacios_deportivos && installation.espacios_deportivos.length > 0) ||
        (installation.espacios_complementarios && installation.espacios_complementarios.length > 0)) && (
        <Dialog
          open={isSpacesModalOpen}
          onOpenChange={(open) => {
            if (!open) setShowTechnicalSheet(false);
            setIsSpacesModalOpen(open);
          }}
        >
          <DialogContent
            className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-[#f5f8fa] rounded-2xl border border-[#072357]/10 shadow-lg"
            closeButtonClassName="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#072357]/10 flex items-center justify-center border-0 shadow-none opacity-100 [&_svg]:w-4 [&_svg]:h-4 text-[#072357] hover:bg-[#072357]/15 transition-colors data-[state=open]:bg-[#072357]/10 data-[state=open]:text-[#072357] focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#072357]/30 focus-visible:ring-offset-2"
          >
            {/* Cabecera fija: handle + título */}
            <div className="shrink-0">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-[#072357]/20" />
              </div>
              <DialogHeader className="px-5 pb-4 pt-2 text-center border-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-[#072357] leading-tight">
                  Espacios Deportivos
                  {installation.espacios_complementarios && installation.espacios_complementarios.length > 0 && (
                    <> y Complementarios</>
                  )}
                </DialogTitle>
                <p className="text-xs sm:text-sm text-[#072357]/50 mt-0.5">
                  {installation.instalacion_nombre}
                </p>
              </DialogHeader>
            </div>
            {/* Contenido con scroll: vista ciudadana y ficha técnica */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 mb-6">
              <div className="space-y-5 sm:space-y-6">
                {/* 1) RESUMEN */}
                {spacesSummary.summaryTextWithBold && (
                  <section className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-[#072357] uppercase tracking-wider mb-3">
                      Resumen
                    </h3>
                    <p className="text-sm text-[#072357]/80 leading-relaxed">
                      {renderSummaryWithBold(spacesSummary.summaryTextWithBold)}
                    </p>
                  </section>
                )}

                {/* 2) MODALIDADES / ACTIVIDADES */}
                {spacesSummary.byModalidad.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#072357] uppercase tracking-wider px-0.5">
                      Modalidades deportivas
                    </h3>
                    {spacesSummary.byModalidad.map(([modalidad, spaces]) => {
                      const cerrado = spaces.every((s) => isEnclosed(s.espacio_cerramiento));
                      const nocturno = spaces.some((s) => allowsNightUse(s.espacio_iluminacion));
                      const pavimentosRaw = [...new Set(spaces.map((s) => s.pavimento_tipo).filter(Boolean))] as string[];
                      const pavimentoHuman = pavimentosRaw.length === 1 && pavimentosRaw[0]
                        ? pavimentoToHuman(pavimentosRaw[0])
                        : pavimentosRaw.length > 1
                          ? 'varios tipos'
                          : '';
                      const showCerrado = cerrado && !spacesSummary.allSpacesEnclosed;
                      const showNocturno = nocturno && !spacesSummary.allSpacesNocturno;
                      const n = spaces.length;
                      const numPalabra = n === 1 ? 'Un' : n === 2 ? 'Dos' : n === 3 ? 'Tres' : n === 4 ? 'Cuatro' : n === 5 ? 'Cinco' : null;
                      const espacioStr = n === 1 ? 'espacio' : 'espacios';
                      let frase = numPalabra ? `${numPalabra} ${espacioStr}` : `${n} ${espacioStr}`;
                      if (showCerrado) frase += ' cerrados';
                      const extras: string[] = [];
                      if (showNocturno) extras.push('iluminación nocturna');
                      if (pavimentoHuman) extras.push(`pavimento de ${pavimentoHuman}`);
                      if (extras.length) frase += ` con ${extras.join(' y ')}`;
                      frase += '.';
                      return (
                        <div
                          key={modalidad}
                          className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
                        >
                          <div className="px-4 py-3 sm:px-5 sm:py-4">
                            <h4 className="text-sm sm:text-base font-semibold text-[#072357]">
                              {modalidad}
                            </h4>
                            <p className="text-xs text-[#072357]/60 mt-1">
                              {frase}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </section>
                )}

                {/* 3) ESPACIOS COMPLEMENTARIOS */}
                {spacesSummary.compCount > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#072357] uppercase tracking-wider px-0.5">
                      Espacios complementarios
                    </h3>
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 p-4 sm:p-5">
                      <p className="text-sm text-[#072357]/80 leading-relaxed">
                        {renderSummaryWithBold(formatComplementariosCountHuman(spacesSummary.compByTipo))}
                      </p>
                      <p className="text-sm text-[#072357]/60 mt-2 leading-relaxed">
                        {renderSummaryWithBold('**Estos espacios complementarios** facilitan el uso continuado y la organización de actividades deportivas.')}
                      </p>
                    </div>
                  </section>
                )}

                {/* 4) FICHA TÉCNICA (desplegable) */}
                <section className="border-t border-[#072357]/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalSheet(!showTechnicalSheet)}
                    className="w-full flex items-center justify-between gap-2 py-2 text-sm font-medium text-[#072357]/70 hover:text-[#072357] transition-colors"
                  >
                    Ver ficha técnica completa
                    {showTechnicalSheet ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showTechnicalSheet && (
                    <div className="space-y-3 sm:space-y-4 mt-4">
                      {installation.espacios_deportivos && installation.espacios_deportivos.length > 0 && (
                        <>
                          {installation.espacios_deportivos.map((space) => (
                            <div
                              key={space.id}
                              className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
                            >
                              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                                <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                                  {space.espacio_nombre}
                                </h4>
                                {space.espacio_codigo && (
                                  <p className="text-xs text-[#072357]/50 mt-1">Código: {space.espacio_codigo}</p>
                                )}
                              </div>
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
                                {space.caracteristicas && space.caracteristicas.length > 0 && (
                                  <div className="pt-2 border-t border-[#072357]/5">
                                    {Object.entries(
                                      space.caracteristicas.reduce((acc, char) => {
                                        const key = char.categoria;
                                        if (!acc[key]) acc[key] = new Set<string>();
                                        acc[key].add(char.caracteristica);
                                        return acc;
                                      }, {} as Record<string, Set<string>>)
                                    ).map(([categoria, set]) => (
                                      <div key={categoria} className="text-xs sm:text-sm text-[#072357]/70">
                                        <span className="font-medium text-[#072357]">{categoria}:</span>{' '}
                                        {Array.from(set).join(', ')}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      {installation.espacios_complementarios && installation.espacios_complementarios.length > 0 && (
                        <>
                          {installation.espacios_complementarios.map((comp) => (
                            <div
                              key={comp.id}
                              className="bg-white rounded-xl sm:rounded-2xl border border-[#072357]/5 overflow-hidden"
                            >
                              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[#072357]/5">
                                <h4 className="text-sm sm:text-base font-semibold text-[#072357] leading-tight">
                                  {comp.espacio_complementario_nombre}
                                </h4>
                                {comp.espacio_complementario_codigo && (
                                  <p className="text-xs text-[#072357]/50 mt-1">Código: {comp.espacio_complementario_codigo}</p>
                                )}
                              </div>
                              <div className="px-4 py-3 sm:px-5 sm:py-4 space-y-2.5">
                                {comp.espacio_complementario_tipo && (
                                  <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                                    <span className="font-medium text-[#072357]">Tipo:</span>
                                    <span>{comp.espacio_complementario_tipo}</span>
                                  </div>
                                )}
                                {comp.espacio_complementario_clase && (
                                  <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#072357]/70">
                                    <span className="font-medium text-[#072357]">Clase:</span>
                                    <span>{comp.espacio_complementario_clase}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </section>
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
  stickyOffsetTop?: number;
}

const ROW_H = 48;

export function V0SportsView({ ineCode, municipalityName, stickyOffsetTop }: V0SportsViewProps) {
  const isSticky = stickyOffsetTop != null && stickyOffsetTop > 0;
  const bar2Top = isSticky ? stickyOffsetTop + ROW_H : undefined;

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

  // Solo mostrar tabs con count > 0 (cuando ya cargó)
  const loading = installationsLoading || centersLoading || eventsLoading;
  const showInstallationsTab = !installationsLoading && allInstallations.length > 0;
  const showCentersTab = !centersLoading && allCenters.length > 0;
  const showEventsTab = !eventsLoading && allEvents.length > 0;
  const hasAnyTab = showInstallationsTab || showCentersTab || showEventsTab;

  // Ajustar activeSection si la actual tiene 0 resultados
  useEffect(() => {
    if (loading || hasAnyTab === false) return;
    const validSection =
      (activeSection === 'installations' && showInstallationsTab) ||
      (activeSection === 'centers' && showCentersTab) ||
      (activeSection === 'events' && showEventsTab);
    if (!validSection) {
      if (showInstallationsTab) setActiveSection('installations');
      else if (showCentersTab) setActiveSection('centers');
      else if (showEventsTab) setActiveSection('events');
      setActiveFilter('all');
    }
  }, [loading, hasAnyTab, activeSection, showInstallationsTab, showCentersTab, showEventsTab]);

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
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-9 sm:h-10 w-24 sm:w-28 rounded-full shrink-0"
                  />
                ))}
              </>
            ) : (
              <>
                {showInstallationsTab && (
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
                )}
                {showCentersTab && (
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
                )}
                {showEventsTab && (
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
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Sin datos de deportes */}
      {!loading && !hasAnyTab && (
        <div className="text-center py-8 text-[#072357]/50">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay datos de deportes en este municipio</p>
        </div>
      )}

      {hasAnyTab && activeSection === 'installations' && (
        <div className="space-y-0">
          {installationsLoading ? (
            <div
              className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
              style={bar2Top != null ? { position: 'sticky', top: bar2Top, zIndex: 10, backgroundColor: '#f5f8fa' } : undefined}
            >
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              <div
                className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
            <div
              className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
              style={bar2Top != null ? { position: 'sticky', top: bar2Top, zIndex: 10, backgroundColor: '#f5f8fa' } : undefined}
            >
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              <div
                className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
      {hasAnyTab && activeSection === 'centers' && (
        <div className="space-y-0">
          {centersLoading ? (
            <div
              className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
              style={bar2Top != null ? { position: 'sticky', top: bar2Top, zIndex: 10, backgroundColor: '#f5f8fa' } : undefined}
            >
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              <div
                className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
            <div
              className="relative -mx-4 sm:-mx-6 h-12 flex items-center bg-[#f5f8fa]"
              style={bar2Top != null ? { position: 'sticky', top: bar2Top, zIndex: 10, backgroundColor: '#f5f8fa' } : undefined}
            >
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f8fa] to-transparent z-10 pointer-events-none sm:hidden" />
              <div
                className="flex gap-1.5 overflow-x-auto h-full items-center px-4 sm:px-6 min-w-0 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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

      {hasAnyTab && activeSection === 'events' && (
        <div className="space-y-0">
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
