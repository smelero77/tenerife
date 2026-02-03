"use client";

import { useState, useEffect } from "react";
import { DemographicsData } from "@/lib/queries/demographics";
import { Users, MapPin } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface DemographicsTableProps {
  data: DemographicsData;
  selectedTownName?: string;
}

const ITEMS_PER_PAGE = 15;

export function DemographicsTable({ data, selectedTownName }: DemographicsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ordenar localidades: primero la buscada (si existe), luego alfabético, y las que empiezan por * al final
  const sortedLocalities = [...data.localities].sort((a, b) => {
    if (selectedTownName) {
      if (a.name === selectedTownName) return -1;
      if (b.name === selectedTownName) return 1;
    }
    
    // Verificar si empiezan por *
    const aStartsWithStar = a.name.trim().startsWith('*');
    const bStartsWithStar = b.name.trim().startsWith('*');
    
    // Si una empieza por * y la otra no, la que empieza por * va al final
    if (aStartsWithStar && !bStartsWithStar) return 1;
    if (!aStartsWithStar && bStartsWithStar) return -1;
    
    // Si ambas empiezan por * o ninguna, ordenar alfabéticamente
    return a.name.localeCompare(b.name, 'es');
  });

  // Calcular paginación
  const totalPages = Math.ceil(sortedLocalities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLocalities = sortedLocalities.slice(startIndex, endIndex);

  // Resetear a página 1 si cambia la localidad seleccionada
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTownName]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-semibold text-sm">Municipio</th>
                <th className="text-right p-3 font-semibold text-sm">Total</th>
                <th className="text-right p-3 font-semibold text-sm">Mujeres/Hombres</th>
                <th className="text-right p-3 font-semibold text-sm">Españoles/Extranjeros</th>
                <th className="text-right p-3 font-semibold text-sm">0-14/15-64/+65</th>
              </tr>
            </thead>
            <tbody>
              {/* Municipality row */}
              <tr className="hover:bg-muted/50">
                <td className="p-3 font-medium">
                  <div className="flex items-center gap-2">
                    {selectedTownName && <span style={{ color: 'var(--chart-3)' }}>★</span>}
                    <span>{data.municipality.name}</span>
                  </div>
                </td>
                <td className="p-3 text-right">{formatNumber(data.municipality.total)}</td>
                <td className="p-3 text-right">
                  <span className="border-b border-dotted border-border cursor-help">
                    {formatNumber(data.municipality.mujeres)}/{formatNumber(data.municipality.hombres)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="border-b border-dotted border-border cursor-help">
                    {formatNumber(data.municipality.espanoles)}/{formatNumber(data.municipality.extranjeros)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <span className="border-b border-dotted border-border cursor-help">
                    {formatNumber(data.municipality.age_0_14)}/{formatNumber(data.municipality.age_15_64)}/{formatNumber(data.municipality.age_65_plus)}
                  </span>
                </td>
              </tr>

              {/* Separator row for Poblaciones */}
              {sortedLocalities.length > 0 && (
                <tr className="bg-muted">
                  <th className="text-left p-3 font-semibold text-sm">Poblaciones</th>
                  <th className="text-right p-3 font-semibold text-sm"></th>
                  <th className="text-right p-3 font-semibold text-sm"></th>
                  <th className="text-right p-3 font-semibold text-sm"></th>
                  <th className="text-right p-3 font-semibold text-sm"></th>
                </tr>
              )}

              {/* Localities rows */}
              {paginatedLocalities.map((locality, index) => {
                const isSelected = selectedTownName && locality.name === selectedTownName;
                return (
                  <tr
                    key={locality.localidad_id || index}
                    className="border-b hover:bg-muted/50"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <MapPin className="h-4 w-4 shrink-0" style={{ color: 'var(--chart-3)', fill: 'var(--chart-3)' }} />
                        ) : null}
                        <span>{locality.name}</span>
                      </div>
                    </td>
                  <td className="p-3 text-right">{formatNumber(locality.total)}</td>
                  <td className="p-3 text-right">
                    {formatNumber(locality.mujeres)}/{formatNumber(locality.hombres)}
                  </td>
                  <td className="p-3 text-right">
                    {formatNumber(locality.espanoles)}/{formatNumber(locality.extranjeros)}
                  </td>
                  <td className="p-3 text-right">
                    {formatNumber(locality.age_0_14)}/{formatNumber(locality.age_15_64)}/{formatNumber(locality.age_65_plus)}
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {sortedLocalities.length > ITEMS_PER_PAGE && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {/* Números de página */}
            {(() => {
              const pages: (number | 'ellipsis')[] = [];
              // En móviles mostrar menos páginas (máximo 5), en desktop más (máximo 7)
              const maxVisiblePages = isMobile ? 5 : 7;
              
              if (totalPages <= maxVisiblePages) {
                // Si hay pocas páginas, mostrar todas
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Siempre mostrar primera página
                pages.push(1);
                
                if (currentPage <= 2) {
                  // Cerca del inicio: 1, 2, 3, ..., última
                  for (let i = 2; i <= 3; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 1) {
                  // Cerca del final: 1, ..., penúltima-1, penúltima, última
                  pages.push('ellipsis');
                  for (let i = totalPages - 2; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // En el medio: 1, ..., actual-1, actual, actual+1, ..., última
                  pages.push('ellipsis');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis');
                  pages.push(totalPages);
                }
              }
              
              return pages.map((page, idx) => {
                if (page === 'ellipsis') {
                  return (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              });
            })()}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <div className="text-right text-sm text-muted-foreground">
        Fuente de los datos: INE
      </div>
    </div>
  );
}
