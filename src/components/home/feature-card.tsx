'use client';

import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  stat,
  statLabel,
}: FeatureCardProps) {
  return (
    <div className="group relative bg-white border border-[#072357]/10 rounded-3xl p-5 sm:p-6 transition-all duration-500 hover:border-[#072357]/30 hover:shadow-[0_8px_40px_rgba(7,35,87,0.15)] active:scale-[0.98]">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-3xl bg-[#072357]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        {/* Icon */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#072357]/10 flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-[#072357]/15 transition-colors duration-300">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#072357]" />
        </div>

        {/* Content */}
        <h3 className="text-base sm:text-xl font-semibold text-[#072357] mb-1 sm:mb-2">
          {title}
        </h3>
        <p className="text-[#072357]/60 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-5 line-clamp-2 sm:line-clamp-none">
          {description}
        </p>

        {/* Stats */}
        <div className="pt-3 sm:pt-4 border-t border-[#072357]/10">
          <span className="text-2xl sm:text-3xl font-bold text-[#072357]">
            {stat}
          </span>
          <span className="block text-[10px] sm:text-xs text-[#072357]/50 mt-0.5 sm:mt-1 uppercase tracking-wider">
            {statLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
