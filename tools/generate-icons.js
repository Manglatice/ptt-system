#!/usr/bin/env node
/**
 * Generate placeholder PWA icons
 * For production, replace with high-quality graphics
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = 'public/icons';

// Simple SVG to PNG conversion would require a library
// For now, this script documents the need and provides an SVG template

const svgTemplate = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#00d9ff"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.34}"
          stroke="#0f0f1e" stroke-width="${size * 0.04}" fill="none"/>
  <path d="M ${size / 2} ${size * 0.25} L ${size / 2} ${size * 0.34}"
        stroke="#0f0f1e" stroke-width="${size * 0.04}" stroke-linecap="round"/>
  <path d="M ${size / 2} ${size * 0.66} L ${size / 2} ${size * 0.75}"
        stroke="#0f0f1e" stroke-width="${size * 0.04}" stroke-linecap="round"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.08}" fill="#0f0f1e"/>
</svg>
`.trim();

async function generateIcons() {
  try {
    // Create icons directory
    await mkdir(OUTPUT_DIR, { recursive: true });

    console.log('📱 Generating PWA icon templates...\n');

    // Generate SVG templates for each size
    for (const size of SIZES) {
      const filename = `${OUTPUT_DIR}/icon-${size}.svg`;
      const svg = svgTemplate(size);

      await new Promise((resolve, reject) => {
        const stream = createWriteStream(filename);
        stream.write(svg);
        stream.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      console.log(`✅ Created ${filename}`);
    }

    console.log('\n🎨 Icon templates generated!');
    console.log('\nℹ️  Note: These are SVG templates.');
    console.log('For production, convert to PNG using:');
    console.log('  - Online tool: https://svgtopng.com/');
    console.log('  - ImageMagick: convert icon.svg icon.png');
    console.log('  - Figma/Sketch/Illustrator');
    console.log('\nOr create custom high-quality icons matching your brand.\n');

  } catch (err) {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
  }
}

generateIcons();
