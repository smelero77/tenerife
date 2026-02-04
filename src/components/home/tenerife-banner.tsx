'use client';

export function TenerifeBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Tenerife Flag - Blue background with white diagonal cross (saltire) */}
      <div className="absolute inset-0 bg-[#072357] opacity-75">
        {/* White diagonal cross using CSS */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Diagonal from top-left to bottom-right */}
          <line
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            stroke="white"
            strokeWidth="18"
          />
          {/* Diagonal from top-right to bottom-left */}
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="white"
            strokeWidth="18"
          />
        </svg>
      </div>

      {/* Giant TENERIFE text */}
      <div className="relative z-10 w-full py-6 sm:py-10 md:py-14">
        <h2
          className="w-full text-center font-black tracking-tighter select-none text-[#072357]"
          style={{
            fontSize: 'clamp(48px, 20vw, 320px)',
            lineHeight: '1',
          }}
        >
          TENERIFE
        </h2>
      </div>
    </section>
  );
}
