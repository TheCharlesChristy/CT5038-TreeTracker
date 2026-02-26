#!/usr/bin/env node
/**
 * Bundles Leaflet CSS and JS from node_modules into a JSON file
 * so the mobile WebView can load them locally instead of from a CDN.
 *
 * Run via: node scripts/bundleLeaflet.js
 * Also runs automatically after `npm install` via the postinstall hook.
 */

const fs = require('fs');
const path = require('path');

const leafletDist = path.join(__dirname, '..', 'node_modules', 'leaflet', 'dist');
const outputDir = path.join(__dirname, '..', 'components', 'base');
const outputFile = path.join(outputDir, 'leafletBundle.json');

const cssPath = path.join(leafletDist, 'leaflet.css');
const jsPath = path.join(leafletDist, 'leaflet.js');

if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
  console.error('Leaflet dist files not found. Run `npm install` first.');
  process.exit(1);
}

const version = require('../node_modules/leaflet/package.json').version;
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

const output = JSON.stringify({ version, css, js });

fs.writeFileSync(outputFile, output, 'utf8');
console.log(`Written ${outputFile}`);
