'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  X,
  Building,
  Copy,
  Check,
  Users,
  Map,
  Mountain,
  Building2,
} from 'lucide-react';
import { getMunicipalitySummaryByIne } from '@/lib/queries/municipality';
import type { MunicipalitySummary } from '@/lib/queries/municipality';
import { DemographicsView } from './v0-demographics-view';
import { MunicipalityDetailSheetSkeleton } from './municipality-detail-sheet-skeleton';
import { formatCoordinates } from '@/lib/utils';

interface MunicipalityDetailSheetProps {
  ineCode: string | null;
  selectedTownName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MunicipalityDetailSheet({
  ineCode,
  selectedTownName,
  isOpen,
  onClose,
}: MunicipalityDetailSheetProps) {
  const [data, setData] = useState<MunicipalitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [coatOfArmsError, setCoatOfArmsError] = useState(false);
  const [coatOfArmsDirectUrl, setCoatOfArmsDirectUrl] = useState<string | null>(null);

  // Load municipality data when opened
  useEffect(() => {
    if (isOpen && ineCode) {
      setLoading(true);
      setCoatOfArmsError(false); // Reset error state when loading new municipality
      setCoatOfArmsDirectUrl(null); // Reset direct URL
      getMunicipalitySummaryByIne(ineCode)
        .then((municipalityData) => {
          setData(municipalityData);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error loading municipality:', error);
          setLoading(false);
        });
    } else {
      setData(null);
      setCoatOfArmsError(false);
      setCoatOfArmsDirectUrl(null);
    }
  }, [isOpen, ineCode]);

  // Fetch direct image URL for coat of arms
  useEffect(() => {
    const url = data?.wikimedia?.coat_of_arms_url;
    if (!url) {
      setCoatOfArmsDirectUrl(null);
      return;
    }

    // If it's already a direct image URL (starts with https://upload.wikimedia.org), use it directly
    if (url.startsWith('https://upload.wikimedia.org') || url.startsWith('http://upload.wikimedia.org')) {
      setCoatOfArmsDirectUrl(url);
      return;
    }

    // Determine the file title format - extract filename from any format
    let fileTitle: string;
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // If it's a Special:FilePath URL, extract the filename
      if (url.includes('Special:FilePath')) {
        const match = url.match(/Special:FilePath\/(.+?)(?:\?|$)/);
        if (match) {
          const filename = decodeURIComponent(match[1]);
          fileTitle = filename.startsWith('File:') ? filename : `File:${filename}`;
        } else {
          setCoatOfArmsDirectUrl(null);
          return;
        }
      } else {
        // Other HTTP URL - try to extract filename or use as is
        setCoatOfArmsDirectUrl(null);
        return;
      }
    } else {
      // If it's just a filename (starts with "File:" or just the filename)
      fileTitle = url.startsWith('File:') ? url : `File:${url}`;
    }
    
    // Fetch direct image URL from MediaWiki API
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        const pages = data.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];
          // Check if page exists and is not a missing page
          if (page.missing === undefined && page.imageinfo) {
            const imageInfo = page.imageinfo?.[0];
            if (imageInfo?.url && imageInfo.url.startsWith('http')) {
              setCoatOfArmsDirectUrl(imageInfo.url);
              return;
            }
          }
        }
        setCoatOfArmsDirectUrl(null);
      })
      .catch((error) => {
        console.error('Error fetching coat of arms URL:', error);
        setCoatOfArmsDirectUrl(null);
      });
  }, [data?.wikimedia?.coat_of_arms_url]);

  if (!isOpen || !ineCode) return null;

  // Extract data only when it exists
  const basic = data?.basic;
  const wikimedia = data?.wikimedia;
  const snapshot = data?.snapshot;

  const handleCopyCoords = () => {
    if (wikimedia?.coordinates_lat && wikimedia?.coordinates_lon) {
      const formatted = formatCoordinates(wikimedia.coordinates_lat, wikimedia.coordinates_lon);
      navigator.clipboard.writeText(formatted);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('es-ES').format(num);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative mt-auto bg-[#f5f8fa] rounded-t-[2rem] h-[92vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#072357]/20" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#072357]/10 flex items-center justify-center z-10"
        >
          <X className="w-4 h-4 text-[#072357]" />
        </button>

        <div className="overflow-y-auto flex-1 pb-safe scrollbar-hide">
          {loading ? (
            <MunicipalityDetailSheetSkeleton />
          ) : data ? (
            <>
              {/* Header - Clean and minimal */}
              <div className="px-5 pb-4 pt-2">
                {/* Municipality name and codes */}
                <div className="flex items-start gap-3">
                  {coatOfArmsDirectUrl && coatOfArmsDirectUrl.startsWith('http') && !coatOfArmsError ? (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-md shrink-0 border border-[#072357]/10">
                      <img
                        src={coatOfArmsDirectUrl}
                        alt={`Escudo de ${basic?.municipio_name || 'municipio'}`}
                        className="w-full h-full object-contain p-1"
                        onError={() => setCoatOfArmsError(true)}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#072357] to-[#0066cc] flex items-center justify-center shadow-md shrink-0">
                      <Building className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-[#072357] leading-tight">
                      {basic?.municipio_name || 'Municipio'}
                    </h2>
                    <div className="flex items-center gap-1 mt-0.5 text-xs sm:text-sm text-[#072357]/50 flex-wrap">
                      {basic?.ine_code && <span>INE {basic.ine_code}</span>}
                      {wikimedia?.postal_code && (
                        <>
                          <span>·</span>
                          <span>CP {wikimedia.postal_code}</span>
                        </>
                      )}
                      {wikimedia?.coordinates_lat &&
                        wikimedia?.coordinates_lon && (
                          <>
                            <span>·</span>
                            <button
                              type="button"
                              onClick={handleCopyCoords}
                              className="inline-flex items-center gap-1 hover:text-[#072357] active:text-[#072357] transition-colors"
                            >
                              <span>
                                {formatCoordinates(wikimedia.coordinates_lat, wikimedia.coordinates_lon)}
                              </span>
                              {copiedCoords ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                </div>

                {/* Key stats in compact grid */}
                <div className="grid grid-cols-4 gap-2 mt-4 bg-white rounded-xl p-3 border border-[#072357]/5">
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-sm sm:text-base font-bold text-[#072357]">
                      {formatNumber(snapshot?.population_total_municipio)}
                    </p>
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#072357]/50" />
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-sm sm:text-base font-bold text-[#072357]">
                      {wikimedia?.surface_area_km2
                        ? formatNumber(wikimedia.surface_area_km2)
                        : '-'}
                    </p>
                    <span className="text-[10px] sm:text-xs text-[#072357]/50">
                      km²
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-sm sm:text-base font-bold text-[#072357]">
                      {wikimedia?.altitude_m
                        ? `${formatNumber(wikimedia.altitude_m)}`
                        : '-'}
                    </p>
                    <Mountain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#072357]/50" />
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-sm sm:text-base font-bold text-[#072357]">
                      {formatNumber(snapshot?.number_of_nuclei)}
                    </p>
                    <span className="text-[10px] sm:text-xs text-[#072357]/50">
                      Localidades
                    </span>
                  </div>
                </div>
              </div>

              {/* Demographics View with tabs */}
              <div className="px-5 mb-6">
                <DemographicsView
                  municipality={data}
                  ineCode={ineCode}
                  selectedTownName={selectedTownName}
                  populationEvolution={null}
                />
              </div>

            </>
          ) : (
            <div className="px-5 py-8 text-center text-[#072357]/50">
              No se pudo cargar la información del municipio
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
