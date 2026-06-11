// Pre-built Salesforce architecture components
// Each component is a config object describing a diagram element

import { getIconDataUri } from './icons.js?v=1.15.7';
import { getVisibleDataObjectFields } from './shapes.js?v=1.15.7';

/** Convert inline stencilSvg markup to a data URI for use as a canvas icon.
 *  Each child element must carry its own fill/stroke — the wrapper SVG sets NO
 *  defaults so nothing leaks into text or explicitly-styled elements. */
export function getStencilSvgDataUri(svgContent, color = '#FFFFFF', size = 32) {
  // Sanitize color before interpolation into SVG markup
  const safeColor = color.replace(/[^a-zA-Z0-9#(),.\s%-]/g, '');
  const svg = svgContent.replace(/currentColor/g, safeColor);
  const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="${size}" height="${size}">${svg}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(full);
}

/** Extract a display hostname from a URL string for the sf.Link subtitle.
 *  Strips a leading "www.". Empty string if the URL is missing or invalid. */
export function extractLinkDomain(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const normalized = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// WCAG luminance-based contrast — returns dark or white text for a given bg
export function contrastTextColor(bgHex) {
  if (!bgHex || bgHex.startsWith('var(')) return null;
  const hex = bgHex.replace('#', '');
  if (hex.length !== 6) return null;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? '#1d1d1f' : '#FFFFFF';
}
