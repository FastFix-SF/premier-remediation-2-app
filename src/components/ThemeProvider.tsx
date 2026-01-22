/**
 * ThemeProvider - Dynamically applies brand colors from business.json
 *
 * This component reads colors from business.json and injects them as CSS
 * custom properties, allowing the brand colors to be updated via the CMS.
 */

import React, { useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusinessConfig';

// Helper to convert hex color to HSL values (without the "hsl()" wrapper)
function hexToHSL(hex: string): string {
  // Remove the # if present
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Return HSL values as "H S% L%" format for CSS variables
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Calculate a contrasting foreground color (white or dark)
function getContrastColor(hex: string): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark colors, dark for light colors
  return luminance > 0.5 ? '220 15% 15%' : '0 0% 100%';
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const business = useBusiness();

  useEffect(() => {
    // Only apply custom colors if they exist in the config
    if (business.colors) {
      const root = document.documentElement;

      // Apply primary color
      if (business.colors.primary) {
        const primaryHSL = hexToHSL(business.colors.primary);
        root.style.setProperty('--primary', primaryHSL);
        root.style.setProperty('--primary-foreground', getContrastColor(business.colors.primary));
        root.style.setProperty('--ring', primaryHSL);
        root.style.setProperty('--sidebar-primary', primaryHSL);
      }

      // Apply secondary color
      if (business.colors.secondary) {
        const secondaryHSL = hexToHSL(business.colors.secondary);
        // Use secondary as a lighter background variant
        root.style.setProperty('--secondary', secondaryHSL);
        root.style.setProperty('--secondary-foreground', getContrastColor(business.colors.secondary));
      }

      // Apply accent color
      if (business.colors.accent) {
        const accentHSL = hexToHSL(business.colors.accent);
        root.style.setProperty('--accent', accentHSL);
        root.style.setProperty('--accent-foreground', getContrastColor(business.colors.accent));
      }
    }

    // Cleanup on unmount (optional, reset to defaults)
    return () => {
      // Don't reset - keep the theme applied
    };
  }, [business.colors]);

  return <>{children}</>;
};

export default ThemeProvider;
