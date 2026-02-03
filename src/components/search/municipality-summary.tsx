'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin, Phone, Mail, Globe, Building2, Navigation, Mountain, Square } from 'lucide-react';
import type { MunicipalitySummary } from '@/lib/queries/municipality';
import { MunicipalitySummarySkeleton } from './municipality-summary-skeleton';
import { cn } from '@/lib/utils';

interface MunicipalitySummaryProps {
  data: MunicipalitySummary;
  selectedTownName?: string; // Si viene de una localidad
  loading?: boolean;
}

export function MunicipalitySummaryComponent({
  data,
  selectedTownName,
  loading = false,
}: MunicipalitySummaryProps) {
  const { basic, wikimedia, snapshot, statistics } = data;

  if (loading) {
    return <MunicipalitySummarySkeleton />;
  }

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '';
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Hook to fetch direct image URL from MediaWiki API
  const useDirectImageUrl = (url: string | null): string | null => {
    const [directUrl, setDirectUrl] = React.useState<string | null>(url);
    
    React.useEffect(() => {
      if (!url || !url.includes('Special:FilePath')) {
        setDirectUrl(url);
        return;
      }
      
      // Extract filename from Special:FilePath URL
      const match = url.match(/Special:FilePath\/(.+?)(?:\?|$)/);
      if (!match) {
        setDirectUrl(url);
        return;
      }
      
      const filename = decodeURIComponent(match[1]);
      const fileTitle = filename.startsWith('File:') ? filename : `File:${filename}`;
      
      // Fetch direct image URL from MediaWiki API
      const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
      
      fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
          const pages = data.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];
            const imageInfo = page.imageinfo?.[0];
            if (imageInfo?.url) {
              setDirectUrl(imageInfo.url);
              return;
            }
          }
          setDirectUrl(url);
        })
        .catch(() => {
          setDirectUrl(url);
        });
    }, [url]);
    
    return directUrl;
  };

  // Normalize image URL - ensure it's a valid external URL and convert to direct image URL
  const normalizeImageUrl = (url: string | null | undefined): string | null => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null;
    }
    
    const trimmedUrl = url.trim();
    
    // If already a full URL starting with http/https, validate and convert if needed
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      // Validate it's a proper URL
      try {
        new URL(trimmedUrl);
        // If it's a Special:FilePath URL, return as is (will be converted by hook)
        if (trimmedUrl.includes('Special:FilePath')) {
          return trimmedUrl;
        }
        // If it's already an upload.wikimedia.org URL, return as is
        if (trimmedUrl.includes('upload.wikimedia.org')) {
          return trimmedUrl;
        }
        return trimmedUrl;
      } catch {
        // Invalid URL format, return null
        return null;
      }
    }
    
    // If it's a relative path or just a filename, construct Wikimedia Commons URL
    // Handle different formats:
    // - "File:Example.jpg" -> convert to direct image URL
    // - "/wiki/File:Example.jpg" -> add domain and convert
    // - "Example.jpg" -> assume it's a file and convert
    
    let filename: string;
    
    if (trimmedUrl.startsWith('File:')) {
      filename = trimmedUrl.substring(5);
    } else if (trimmedUrl.startsWith('/wiki/File:')) {
      filename = trimmedUrl.substring(11);
    } else if (trimmedUrl.startsWith('/')) {
      // Try to extract filename from path
      const parts = trimmedUrl.split('/');
      filename = parts[parts.length - 1];
    } else {
      filename = trimmedUrl;
    }
    
    // Convert to direct image URL using thumbnail API
    // This provides a direct image URL that works without CORS issues
    const encodedFilename = encodeURIComponent(filename);
    const directUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}?width=800`;
    
    // Validate the constructed URL
    try {
      new URL(directUrl);
      return directUrl;
    } catch {
      return null;
    }
  };

  const coatOfArmsUrl = normalizeImageUrl(wikimedia?.coat_of_arms_url);
  const normalizedMunicipalityUrl = normalizeImageUrl(wikimedia?.image_url);
  const municipalityImageUrl = useDirectImageUrl(normalizedMunicipalityUrl);

  const hasCoordinates =
    wikimedia?.coordinates_lat && wikimedia?.coordinates_lon;

  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(Number(wikimedia.coordinates_lon) - 0.01).toFixed(6)},${(Number(wikimedia.coordinates_lat) - 0.01).toFixed(6)},${(Number(wikimedia.coordinates_lon) + 0.01).toFixed(6)},${(Number(wikimedia.coordinates_lat) + 0.01).toFixed(6)}&layer=mapnik&marker=${wikimedia.coordinates_lat},${wikimedia.coordinates_lon}`
    : null;

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${wikimedia.coordinates_lat},${wikimedia.coordinates_lon}`
    : null;

  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${wikimedia.coordinates_lat}&mlon=${wikimedia.coordinates_lon}&zoom=14`
    : null;

  return (
    <div id="municipality-summary" className="w-full space-y-6 mt-8">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex items-start gap-4 flex-1">
              <Avatar className="h-20 w-20">
                {coatOfArmsUrl ? (
                  <AvatarImage
                    src={coatOfArmsUrl}
                    alt={`Escudo de ${basic.municipio_name}`}
                    onError={(e) => {
                      // Si falla la carga, ocultar y mostrar fallback
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {basic.municipio_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <CardTitle className="text-2xl sm:text-3xl">
                    {basic.municipio_name}
                  </CardTitle>
                </div>
              <div className="flex flex-col gap-2">
                {wikimedia?.postal_code && (
                  <Badge variant="outline">
                    CP: {wikimedia.postal_code}
                  </Badge>
                )}
                {wikimedia?.official_website && (
                  <a
                    href={wikimedia.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Badge variant="outline" className="hover:bg-accent cursor-pointer w-fit">
                      Web ayuntamiento
                    </Badge>
                  </a>
                )}
              </div>
            </div>
            </div>
            {/* Datos Geográficos e Imagen - Alineados a la derecha */}
            <div className="flex flex-col gap-3 text-right text-sm">
              <div className="flex items-start justify-end gap-4">
                {/* Código INE y Datos Geográficos */}
                <div className="flex flex-col gap-2 items-end">
                  <Badge variant="outline" className="w-fit">INE: {basic.ine_code}</Badge>
                  {(wikimedia?.coordinates_lat ||
                    wikimedia?.coordinates_lon ||
                    wikimedia?.altitude_m ||
                    wikimedia?.surface_area_km2) && (
                    <div className="flex flex-col gap-2">
                      {wikimedia?.coordinates_lat && wikimedia?.coordinates_lon && (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">
                            {wikimedia.coordinates_lat.toFixed(6)}, {wikimedia.coordinates_lon.toFixed(6)}
                          </span>
                          <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      )}
                      {wikimedia?.altitude_m && (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">
                            {formatNumber(wikimedia.altitude_m)} m
                          </span>
                          <Mountain className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      )}
                      {wikimedia?.surface_area_km2 && (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground">
                            {formatNumber(wikimedia.surface_area_km2)} km²
                          </span>
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Imagen del municipio - A la derecha, alineada con el inicio del código INE */}
                {municipalityImageUrl && (
                  <div className="shrink-0 flex flex-col gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={municipalityImageUrl}
                      alt={`Imagen de ${basic.municipio_name}`}
                      className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg border"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Si falla la carga, ocultar la imagen
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Separator className="my-4" />
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xl font-semibold mb-1">
                {snapshot
                  ? formatNumber(snapshot.population_total_municipio)
                  : 'No disponible'}
              </div>
              <div className="text-sm text-muted-foreground">Habitantes</div>
            </div>
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xl font-semibold mb-1">
                {snapshot
                  ? formatNumber(snapshot.number_of_nuclei)
                  : 'No disponible'}
              </div>
              <div className="text-sm text-muted-foreground">Localidades</div>
            </div>
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xl font-semibold mb-1">
                {statistics.centros_educativos_culturales > 0
                  ? formatNumber(statistics.centros_educativos_culturales)
                  : 'No disponible'}
              </div>
              <div className="text-sm text-muted-foreground">Centros Educativos</div>
            </div>
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xl font-semibold mb-1">
                {statistics.centros_medicos_farmacias > 0
                  ? formatNumber(statistics.centros_medicos_farmacias)
                  : 'No disponible'}
              </div>
              <div className="text-sm text-muted-foreground">Centros Médicos</div>
            </div>
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xl font-semibold mb-1">
                {statistics.bienes_interes_cultural > 0
                  ? formatNumber(statistics.bienes_interes_cultural)
                  : 'No disponible'}
              </div>
              <div className="text-sm text-muted-foreground">Centros Culturales</div>
            </div>
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <div className="text-xl font-semibold mb-1">
                {statistics.comercios_alimentacion + statistics.locales_comerciales + statistics.comercios_agricultura > 0
                  ? formatNumber(statistics.comercios_alimentacion + statistics.locales_comerciales + statistics.comercios_agricultura)
                  : 'No disponible'}
              </div>
              <div className="text-sm text-muted-foreground">Comercios</div>
            </div>
          </div>

          {/* Contacto Ayuntamiento y Mapa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Contacto Ayuntamiento */}
            <div className="space-y-3">
              {wikimedia?.mayor_name ? (
                <div><span className="font-semibold">Alcalde:</span> {wikimedia.mayor_name}</div>
              ) : (
                <div><span className="font-semibold">Alcalde:</span> </div>
              )}
              {wikimedia?.cif ? (
                <div><span className="font-semibold">CIF:</span> {wikimedia.cif}</div>
              ) : (
                <div><span className="font-semibold">CIF:</span> </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{wikimedia?.town_hall_address || ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                {wikimedia?.phone_number ? (
                  <a
                    href={`tel:${wikimedia.phone_number}`}
                    className="hover:underline"
                  >
                    {wikimedia.phone_number}
                  </a>
                ) : (
                  <span></span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                {wikimedia?.email ? (
                  <a
                    href={`mailto:${wikimedia.email}`}
                    className="hover:underline"
                  >
                    {wikimedia.email}
                  </a>
                ) : (
                  <span></span>
                )}
              </div>
            </div>

            {/* Mapa */}
            {hasCoordinates && (
              <div className="space-y-2">
                {mapUrl ? (
                  <div className="w-full h-64 rounded-lg overflow-hidden border">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={mapUrl}
                      className="border-0"
                    />
                  </div>
                ) : (
                  <div className="text-muted-foreground">Mapa no disponible</div>
                )}
                <div className="flex gap-2 justify-end">
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                        Google Maps
                      </Badge>
                    </a>
                  )}
                  {openStreetMapUrl && (
                    <a
                      href={openStreetMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                        OpenStreetMap
                      </Badge>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

