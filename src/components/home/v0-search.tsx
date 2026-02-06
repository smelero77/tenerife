'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Search, Building2, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchMunicipalities, searchTowns } from '@/lib/queries/search';
import type {
  MunicipalitySearchResult,
  TownSearchResult,
} from '@/lib/queries/search';
import { cn } from '@/lib/utils';

/**
 * Highlight matching text in bold
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <span className="text-[#072357] font-semibold">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}

interface V0SearchProps {
  className?: string;
  onSelectMunicipality?: (ineCode: string, townName?: string) => void;
}

export function V0Search({ className, onSelectMunicipality }: V0SearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [municipalities, setMunicipalities] = useState<
    MunicipalitySearchResult[]
  >([]);
  const [towns, setTowns] = useState<TownSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search when debounced query changes (minimum 2 characters)
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setMunicipalities([]);
      setTowns([]);
      setLoading(false);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);

    Promise.all([
      searchMunicipalities(debouncedQuery),
      searchTowns(debouncedQuery),
    ])
      .then(([municipalitiesData, townsData]) => {
        setMunicipalities(municipalitiesData);
        setTowns(townsData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error searching:', error);
        setLoading(false);
      });
  }, [debouncedQuery]);


  const handleSelectMunicipality = (ineCode: string) => {
    setShowResults(false);
    setSearchQuery('');
    if (onSelectMunicipality) {
      onSelectMunicipality(ineCode);
    } else {
      router.push(`/municipios/${ineCode}`);
    }
  };

  const handleSelectTown = (ineCode: string, townName: string) => {
    setShowResults(false);
    setSearchQuery('');
    if (onSelectMunicipality) {
      onSelectMunicipality(ineCode, townName);
    } else {
      router.push(
        `/municipios/${ineCode}?localidad=${encodeURIComponent(townName)}`
      );
    }
  };

  const hasResults = municipalities.length > 0 || towns.length > 0;

  return (
    <div ref={searchContainerRef} className={cn('relative z-20 w-full', className)}>
      {/* Animated border container */}
      <div
        className={cn(
          'relative p-[2px] rounded-2xl transition-all duration-500 animate-border-rotate',
          isFocused ? 'scale-[1.02]' : ''
        )}
        style={{
          background: isFocused
            ? 'conic-gradient(from var(--angle, 0deg), #072357, #0066cc, #00aaff, #072357)'
            : 'transparent',
        }}
      >
        {/* Animated glow behind */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl blur-xl transition-opacity duration-500',
            isFocused ? 'opacity-40' : 'opacity-0'
          )}
          style={{
            background:
              'conic-gradient(from var(--angle, 0deg), #072357, #0066cc, #00aaff, #072357)',
          }}
        />

        {/* Inner search container */}
        <div className="relative flex items-center bg-white rounded-2xl shadow-lg">
          <Search
            className={cn(
              'absolute left-5 w-5 h-5 transition-colors duration-300',
              isFocused ? 'text-[#072357]' : 'text-[#072357]/40'
            )}
          />
          <input
            type="text"
            placeholder="Buscar municipios, servicios, datos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay to allow click on results
              setTimeout(() => setIsFocused(false), 200);
            }}
            className="w-full py-4 pl-14 pr-4 bg-transparent text-[#072357] placeholder:text-[#072357]/40 focus:outline-none text-base rounded-2xl"
          />
        </div>
      </div>

      {/* Search Results - positioned below input */}
      {showResults && !loading && hasResults && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-[#072357]/10 overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="max-h-[240px] overflow-y-auto bg-white scrollbar-hide">
            {/* Municipios section */}
            {municipalities.length > 0 && (
              <>
                <div className="px-4 py-2 bg-[#f8fafc] border-b border-[#072357]/10 sticky top-0 z-10">
                  <p className="text-xs text-[#072357]/60 font-medium uppercase tracking-wider">
                    Municipios {municipalities.length > 5 && `(${municipalities.length})`}
                  </p>
                </div>
                {municipalities.map((municipality) => (
                  <button
                    key={municipality.ine_code}
                    type="button"
                    onClick={() => handleSelectMunicipality(municipality.ine_code)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#072357]/5 transition-all duration-200 active:bg-[#072357]/10 border-b border-[#072357]/5 last:border-b-0"
                  >
                    <Building2 className="w-5 h-5 text-[#072357]/60 shrink-0" />
                    <span className="text-[#072357] text-sm">
                      <HighlightedText
                        text={municipality.municipio_name}
                        query={debouncedQuery}
                      />
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Localidades section */}
            {towns.length > 0 && (
              <>
                <div className="px-4 py-2 bg-[#f8fafc] border-b border-[#072357]/10 sticky top-0 z-10">
                  <p className="text-xs text-[#072357]/60 font-medium uppercase tracking-wider">
                    Localidades {towns.length > 5 && `(${towns.length})`}
                  </p>
                </div>
                {towns.map((town) => (
                  <button
                    key={town.localidad_id}
                    type="button"
                    onClick={() =>
                      handleSelectTown(town.ine_code, town.localidad_name)
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#072357]/5 transition-all duration-200 active:bg-[#072357]/10 border-b border-[#072357]/5 last:border-b-0"
                  >
                    <MapPin className="w-5 h-5 text-[#072357]/60 shrink-0" />
                    <div className="flex-1 text-left">
                      <span className="text-[#072357] text-sm">
                        <HighlightedText
                          text={town.localidad_name}
                          query={debouncedQuery}
                        />
                      </span>
                      <span className="text-[#072357]/40 text-sm ml-2">
                        {town.municipio_name}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
