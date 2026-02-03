"use client";

import { useState, useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, Heart, Palette, Camera, ShoppingBag, Sprout, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataCategory = 
  | "demografia"
  | "educacion"
  | "sanidad"
  | "cultura"
  | "turismo"
  | "comercios"
  | "agricultura";

interface DataNavigationProps {
  activeCategory: DataCategory;
  onCategoryChange: (category: DataCategory) => void;
}

const categories: Array<{
  id: DataCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "demografia",
    label: "Demografía",
    icon: Users,
  },
  {
    id: "educacion",
    label: "Educación",
    icon: GraduationCap,
  },
  {
    id: "sanidad",
    label: "Sanidad",
    icon: Heart,
  },
  {
    id: "cultura",
    label: "Cultura",
    icon: Palette,
  },
  {
    id: "turismo",
    label: "Turismo",
    icon: Camera,
  },
  {
    id: "comercios",
    label: "Comercios",
    icon: ShoppingBag,
  },
  {
    id: "agricultura",
    label: "Agricultura",
    icon: Sprout,
  },
];

export function DataNavigation({
  activeCategory,
  onCategoryChange,
}: DataNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScrollButtons = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 200;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="w-full">
      {/* Contenedor con flechas a los lados */}
      <div className="relative flex items-center gap-2">
        {/* Flecha izquierda */}
        {showLeftArrow && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background shadow-sm border hover:bg-accent shrink-0 sm:hidden"
            onClick={() => scroll('left')}
            aria-label="Desplazar izquierda"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Contenedor con scroll */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto scrollbar-hide bg-muted rounded-lg sm:bg-transparent"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={checkScrollButtons}
        >
          <Tabs
            value={activeCategory}
            onValueChange={(value) => onCategoryChange(value as DataCategory)}
            className="w-full"
          >
            <TabsList className="inline-flex w-auto min-w-full justify-start bg-transparent rounded-lg p-1 h-auto flex-nowrap sm:flex-wrap sm:w-full sm:bg-muted">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className={cn(
                      "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md transition-all whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{category.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Flecha derecha */}
        {showRightArrow && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background shadow-sm border hover:bg-accent shrink-0 sm:hidden"
            onClick={() => scroll('right')}
            aria-label="Desplazar derecha"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
