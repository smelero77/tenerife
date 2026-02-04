'use client';

const stats = [
  { value: '928K', label: 'Habitantes' },
  { value: '2.034', label: 'km² Superficie' },
  { value: '3.715m', label: 'Altitud máxima' },
  { value: '5M+', label: 'Turistas/año' },
];

export function StatsSection() {
  return (
    <section className="relative px-4 py-12 bg-[#f0f5fa]">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#072357] rounded-3xl p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
