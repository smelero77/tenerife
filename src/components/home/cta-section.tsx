'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function CTASection() {
  const router = useRouter();

  return (
    <section className="relative px-4 py-16 sm:py-24 bg-[#f0f5fa]">
      <div className="max-w-2xl mx-auto text-center">
        {/* Decorative element */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#072357]/10 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-[#072357]" />
          <span className="text-sm text-[#072357] font-medium">Datos abiertos</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#072357] mb-4 text-balance">
          Comienza a explorar ahora
        </h2>
        <p className="text-[#072357]/60 mb-8 max-w-md mx-auto text-pretty">
          Accede a toda la información de Tenerife de forma gratuita y sin registro
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => {
              // Scroll to top and focus search
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-full px-8 py-6 text-base font-medium bg-[#072357] text-white hover:bg-[#004080] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Explorar datos
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 py-6 text-base font-medium border-[#072357]/20 text-[#072357] hover:bg-[#072357]/5 transition-all duration-300 bg-transparent"
          >
            Ver documentación
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-[#072357]/10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#072357]/60">
          <p>Tenerife Data Explorer</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#072357] transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-[#072357] transition-colors">
              Términos
            </a>
            <a href="#" className="hover:text-[#072357] transition-colors">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </section>
  );
}
