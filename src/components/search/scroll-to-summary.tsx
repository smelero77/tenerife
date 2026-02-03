'use client';

import { useEffect, useRef } from 'react';

export function ScrollToSummary() {
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      if (summaryRef.current) {
        summaryRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return <div ref={summaryRef} className="scroll-mt-24" />;
}
