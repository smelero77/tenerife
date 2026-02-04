'use client';

import { Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function MunicipalityDetailSheetSkeleton() {
  return (
    <>
      {/* Header - Clean and minimal - Exact same structure as real component */}
      <div className="px-5 pb-4 pt-2">
        {/* Municipality name and codes */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-[#072357] to-[#0066cc] flex items-center justify-center shadow-md shrink-0">
            <Building className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Title skeleton - matches text-lg sm:text-xl font-bold */}
            <Skeleton className="h-6 sm:h-7 w-48 mb-2" />
            {/* Codes skeleton - matches text-xs sm:text-sm */}
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <Skeleton className="h-3 sm:h-4 w-16" />
              <span className="text-[#072357]/50">·</span>
              <Skeleton className="h-3 sm:h-4 w-12" />
              <span className="text-[#072357]/50">·</span>
              <Skeleton className="h-3 sm:h-4 w-32" />
            </div>
          </div>
        </div>

        {/* Key stats in compact grid - Exact same structure */}
        <div className="grid grid-cols-4 gap-2 mt-4 bg-white rounded-xl p-3 border border-[#072357]/5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              {/* Matches text-sm sm:text-base font-bold */}
              <Skeleton className="h-5 sm:h-6 w-16 mx-auto mb-1" />
              {/* Matches text-[10px] sm:text-xs */}
              <Skeleton className="h-3 sm:h-3.5 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Demographics View skeleton - Matches DemographicsView structure */}
      <div className="px-5 mb-6 space-y-4 sm:space-y-6">
        {/* Tabs skeleton - matches horizontal scrollable tabs */}
        <div className="relative -mx-5">
          <div className="flex gap-2 overflow-x-hidden pb-1 px-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton
                key={i}
                className="h-9 sm:h-10 w-24 sm:w-28 rounded-full shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Ayuntamiento tab skeleton - matches the actual structure */}
        <div className="space-y-4 sm:space-y-6">
          {/* Municipality Image skeleton */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#072357]/5">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#072357]/5">
              <Skeleton className="w-full h-full" />
            </div>
          </div>

          {/* Contact actions skeleton - matches icon + name structure */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#072357]/5">
            {/* Matches text-sm font-semibold uppercase */}
            <Skeleton className="h-4 w-20 mb-4" />
            <div className="flex items-center gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  {/* Matches w-12 h-12 rounded-full */}
                  <Skeleton className="w-12 h-12 rounded-full" />
                  {/* Matches text-xs font-medium */}
                  <Skeleton className="h-3.5 w-12" />
                </div>
              ))}
            </div>
          </div>

          {/* Map skeleton - matches map section */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#072357]/5">
            {/* Matches text-sm font-semibold uppercase */}
            <Skeleton className="h-4 w-24 mb-4" />
            <div className="relative bg-white rounded-2xl overflow-hidden border border-[#072357]/5">
              <div className="relative w-full aspect-video bg-[#072357]/5">
                <Skeleton className="w-full h-full" />
              </div>
              {/* Links skeleton */}
              <div className="px-4 py-2.5 bg-[#f8fafc] border-t border-[#072357]/5 flex gap-3 justify-end">
                <Skeleton className="h-3 w-20" />
                <span className="text-xs text-[#072357]/30">|</span>
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
