import { useState, useEffect } from 'react';

/**
 * Extrae el color dominante de una imagen usando Canvas API.
 * Devuelve un gradiente CSS listo para usar como fondo del hero.
 * Si hay error de CORS o la imagen no carga, devuelve null (fallback al tipo).
 */

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function buildGradient(r, g, b) {
  const [h, s] = rgbToHsl(r, g, b);
  // Dos variantes oscuras del color dominante hacia #0E0E0E
  const dark1 = hslToHex(h, Math.min(s, 60), 8);
  const dark2 = hslToHex(h, Math.min(s, 50), 13);
  return `linear-gradient(135deg, ${dark1} 0%, ${dark2} 50%, #0E0E0E 100%)`;
}

function extractDominantColor(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const SIZE = 64;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SIZE, SIZE);

      let data;
      try {
        data = ctx.getImageData(0, 0, SIZE, SIZE).data;
      } catch {
        reject(new Error('CORS'));
        return;
      }

      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue;                    // transparente
        const brightness = r + g + b;
        if (brightness < 60 || brightness > 690) continue; // muy oscuro o muy blanco
        rSum += r; gSum += g; bSum += b; count++;
      }

      if (count === 0) { reject(new Error('no pixels')); return; }

      resolve(buildGradient(
        Math.round(rSum / count),
        Math.round(gSum / count),
        Math.round(bSum / count),
      ));
    };

    img.onerror = () => reject(new Error('load error'));
    img.src = imageUrl;
  });
}

export function useImageColor(imageUrl) {
  const [gradient, setGradient] = useState(null);

  useEffect(() => {
    if (!imageUrl) { setGradient(null); return; }

    // Canvas + crossOrigin solo funciona con imágenes del mismo origen (Supabase Storage).
    // URLs externas no tienen headers CORS → omitir extracción, usar gradiente fallback.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
    if (!supabaseUrl || !imageUrl.startsWith(supabaseUrl)) {
      setGradient(null);
      return;
    }

    setGradient(null);
    extractDominantColor(imageUrl)
      .then(setGradient)
      .catch(() => setGradient(null));
  }, [imageUrl]);

  return gradient;
}
