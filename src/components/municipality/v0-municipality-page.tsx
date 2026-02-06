'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Building,
  Copy,
  Check,
} from 'lucide-react';
import type { MunicipalitySummary } from '@/lib/queries/municipality';
import { DemographicsView } from './v0-demographics-view';

interface V0MunicipalityPageProps {
  data: MunicipalitySummary;
  selectedTownName?: string;
  ineCode: string;
}


export function V0MunicipalityPage({
  data,
  selectedTownName,
  ineCode,
}: V0MunicipalityPageProps) {
  const { basic, wikimedia, snapshot } = data;
  const [copiedCoords, setCopiedCoords] = useState(false);

  const handleCopyCoords = () => {
    if (wikimedia?.coordinates_lat && wikimedia?.coordinates_lon) {
      navigator.clipboard.writeText(
        `${wikimedia.coordinates_lat}, ${wikimedia.coordinates_lon}`
      );
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('es-ES').format(num);
  };

  return (
    <div className="min-h-screen bg-[#f5f8fa]">
      {/* Header - Clean and minimal */}
      <div className="bg-white border-b border-[#003366]/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#003366] to-[#0066cc] flex items-center justify-center shadow-md shrink-0">
              <Building className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#003366] leading-tight">
                {basic.municipio_name}
              </h1>
              <div className="flex items-center gap-1 mt-0.5 text-xs sm:text-sm text-[#003366]/50 flex-wrap">
                <span>INE {basic.ine_code}</span>
                {wikimedia?.postal_code && (
                  <>
                    <span>·</span>
                    <span>CP {wikimedia.postal_code}</span>
                  </>
                )}
                {wikimedia?.coordinates_lat && wikimedia?.coordinates_lon && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleCopyCoords}
                      className="inline-flex items-center gap-1 hover:text-[#003366] active:text-[#003366] transition-colors"
                    >
                      <span>
                        {wikimedia.coordinates_lat.toFixed(4)},{' '}
                        {wikimedia.coordinates_lon.toFixed(4)}
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
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-4 bg-white rounded-xl p-3 border border-[#003366]/5">
            <div className="text-center">
              <p className="text-sm sm:text-base font-bold text-[#003366]">
                {formatNumber(snapshot?.population_total_municipio)}
              </p>
              <p className="text-[10px] sm:text-xs text-[#003366]/50">
                Habitantes
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm sm:text-base font-bold text-[#003366]">
                {wikimedia?.surface_area_km2
                  ? formatNumber(wikimedia.surface_area_km2)
                  : '-'}
              </p>
              <p className="text-[10px] sm:text-xs text-[#003366]/50">km²</p>
            </div>
            <div className="text-center">
              <p className="text-sm sm:text-base font-bold text-[#003366]">
                {wikimedia?.altitude_m ? `${formatNumber(wikimedia.altitude_m)}` : '-'}
              </p>
              <p className="text-[10px] sm:text-xs text-[#003366]/50">
                m altitud
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm sm:text-base font-bold text-[#003366]">
                {formatNumber(data?.number_of_localities)}
              </p>
              <p className="text-[10px] sm:text-xs text-[#003366]/50">
                Localidades
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Demographics View with tabs */}
        <div className="mb-6 sm:mb-8">
          <DemographicsView
            municipality={data}
            ineCode={ineCode}
            selectedTownName={selectedTownName}
            populationEvolution={null}
          />
        </div>
      </div>
    </div>
  );
}
