import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) {
    return '0';
  }
  // Convert to number, handling both string and number types
  let numValue: number;
  if (typeof num === 'string') {
    // Remove any whitespace and try to parse
    // If the string contains "/", extract the number part before the "/"
    const cleaned = num.trim().split('/')[0].replace(/[^\d.-]/g, '');
    numValue = parseFloat(cleaned);
  } else {
    numValue = num;
  }
  
  // Check if it's a valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    return '0';
  }
  
  // Convert to integer for formatting
  const intValue = Math.floor(numValue);
  
  // Always format with thousands separator, even for numbers < 1000
  // Reverse the number, add dots every 3 digits, then reverse back
  const numStr = intValue.toString();
  if (numStr.length <= 3) {
    // For numbers <= 3 digits, no separator needed (standard Spanish format)
    return numStr;
  }
  
  const reversed = numStr.split('').reverse();
  const formatted = [];
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) {
      formatted.push('.');
    }
    formatted.push(reversed[i]);
  }
  return formatted.reverse().join('');
}

/**
 * Format coordinates to degrees, minutes, seconds with direction (N/S/E/W)
 */
export function formatCoordinates(lat: number, lon: number): string {
  const formatDMS = (decimal: number, isLatitude: boolean): string => {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60);
    
    const direction = isLatitude
      ? decimal >= 0 ? 'N' : 'S'
      : decimal >= 0 ? 'E' : 'W';
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };
  
  const latFormatted = formatDMS(lat, true);
  const lonFormatted = formatDMS(lon, false);
  
  return `${latFormatted} ${lonFormatted}`;
}
