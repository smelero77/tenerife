'use client';

import * as React from 'react';
import { Search, MapPin, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { searchMunicipalities, searchTowns } from '@/lib/queries/search';
import type {
  MunicipalitySearchResult,
  TownSearchResult,
} from '@/lib/queries/search';
import { cn } from '@/lib/utils';

/**
 * Highlight matching text in bold
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <strong key={index}>{part}</strong>
    ) : (
      part
    )
  );
}

interface GoogleLikeSearchProps {
  className?: string;
}

export function GoogleLikeSearch({ className }: GoogleLikeSearchProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [municipalities, setMunicipalities] = React.useState<
    MunicipalitySearchResult[]
  >([]);
  const [towns, setTowns] = React.useState<TownSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Debounce query (250ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Search when debounced query changes (minimum 3 characters)
  React.useEffect(() => {
    if (debouncedQuery.length < 3) {
      setMunicipalities([]);
      setTowns([]);
      setLoading(false);
      return;
    }

    setLoading(true);

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
    setOpen(false);
    setQuery('');
    router.push(`/municipios/${ineCode}`);
  };

  const handleSelectTown = (ineCode: string, townName: string) => {
    setOpen(false);
    setQuery('');
    // Redirigir al municipio padre, no a la página de la localidad
    // Pasar el nombre de la localidad como query parameter
    router.push(`/municipios/${ineCode}?localidad=${encodeURIComponent(townName)}`);
  };

  const hasResults = municipalities.length > 0 || towns.length > 0;
  const showPopover = open && debouncedQuery.length >= 3 && (hasResults || loading);

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar municipios o localidades..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.length >= 3) {
                  setOpen(true);
                } else {
                  setOpen(false);
                }
              }}
              onFocus={() => {
                if (debouncedQuery.length >= 3) {
                  setOpen(true);
                }
              }}
              className="h-14 pl-12 pr-4 text-base rounded-full border-2 focus:border-primary cursor-text"
            />
          </div>
        </PopoverTrigger>
        {showPopover && (
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command shouldFilter={false}>
              <CommandList>
                {loading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    {municipalities.length > 0 && (
                      <CommandGroup heading="Municipios">
                        {municipalities.map((municipality) => (
                          <CommandItem
                            key={municipality.ine_code}
                            value={municipality.municipio_name}
                            onSelect={() =>
                              handleSelectMunicipality(municipality.ine_code)
                            }
                            className="cursor-pointer"
                          >
                            <Building2 className="mr-2 h-4 w-4 shrink-0" />
                            <span>
                              {highlightMatch(
                                municipality.municipio_name,
                                debouncedQuery
                              )}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {towns.length > 0 && (
                      <CommandGroup heading="Localidades">
                        {towns.map((town) => (
                          <CommandItem
                            key={town.localidad_id}
                            value={town.localidad_name}
                            onSelect={() => handleSelectTown(town.ine_code, town.localidad_name)}
                            className="cursor-pointer"
                          >
                            <MapPin className="mr-2 h-4 w-4 shrink-0" />
                            <span>
                              {highlightMatch(town.localidad_name, debouncedQuery)}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {town.municipio_name}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {!loading && municipalities.length === 0 && towns.length === 0 && (
                      <CommandEmpty>No se encontraron resultados</CommandEmpty>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
