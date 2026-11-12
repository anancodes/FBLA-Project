/*
 * geo.js
 * ZIP code lookups and distance math for "find shifts near me".
 *   lookupZip("77005")      -> {zip, lat, lon, city, st} or null
 *   zipError("7700a")       -> a message if the ZIP isn't valid, "" if it is
 *   distanceMiles(a, b)     -> miles between two {lat, lon} points (great-circle distance)
 *   nearestZip(lat, lon)    -> the ZIP whose center is closest to a point
 *   offsetPoint(p, east, north) -> a point moved by some miles east and north
 */
"use strict";

let ZIP_INDEX = null;   // built the first time it's needed, so the page opens fast

function zipIndex(){
  if (ZIP_INDEX) return ZIP_INDEX;
  ZIP_INDEX = new Map();
  for (const row of ZIP_DATA.split(";")){
    const [zip, lat, lon, city, st, type] = row.split(",");
    ZIP_INDEX.set(zip, {zip, lat:+lat, lon:+lon, city, st, regular:!type});
  }
  return ZIP_INDEX;
}
const lookupZip = zip => zipIndex().get(String(zip).trim()) || null;

// Syntactic check (5 digits) first, then semantic check (it's a real ZIP).
function zipError(value){
  const z = String(value).trim();
  if (!/^\d{5}$/.test(z)) return "Enter a 5-digit ZIP code, like 20001.";
  if (!lookupZip(z)) return `We couldn't find ZIP code ${z}. Check the number and try again.`;
  return "";
}

// Haversine formula: distance on the Earth's surface, in miles.
function distanceMiles(a, b){
  const R = 3958.8, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Move a point a number of miles east and north (accurate enough for a few miles).
function offsetPoint(p, east, north){
  return {lat: p.lat + north / 69.0, lon: p.lon + east / (69.17 * Math.cos(p.lat * Math.PI / 180))};
}

// Closest regular (neighborhood) ZIP to a point. Cached because this scans every ZIP.
const nearestCache = new Map();
function nearestZip(lat, lon){
  const key = lat.toFixed(4) + "," + lon.toFixed(4);
  if (nearestCache.has(key)) return nearestCache.get(key);
  let best = null, bestD = Infinity;
  for (const z of zipIndex().values()){
    if (!z.regular) continue;                 // skip PO-box-only and single-building ZIPs
    const d = (z.lat - lat) ** 2 + ((z.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2;
    if (d < bestD){ bestD = d; best = z; }
  }
  nearestCache.set(key, best);
  return best;
}

const placeName = z => z ? `${z.city}, ${z.st}` : "";
const fmtMiles = m => m < 0.95 ? "Under 1 mi" : `${m < 10 ? m.toFixed(1) : Math.round(m)} mi`;

// City-level lookup uses the existing local dataset. No address, browser location,
// or external geocoding service is needed. Distances are approximate city-center distances.
let CITY_INDEX = null;
const normalizePlace = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
function cities(){
  if (CITY_INDEX) return CITY_INDEX;
  const grouped = new Map();
  for (const z of zipIndex().values()){
    if (!z.regular) continue;
    const key = `${z.city}, ${z.st}`;
    const c = grouped.get(key) || {city:z.city, st:z.st, lat:0, lon:0, count:0};
    c.lat += z.lat; c.lon += z.lon; c.count++;
    grouped.set(key, c);
  }
  CITY_INDEX = [...grouped.values()].map(c => ({city:c.city, st:c.st, lat:c.lat / c.count, lon:c.lon / c.count})).sort((a,b) => placeName(a).localeCompare(placeName(b)));
  return CITY_INDEX;
}
function resolveCity(value){
  const key = normalizePlace(value);
  if (!key) return null;
  const exact = cities().find(c => normalizePlace(placeName(c)) === key);
  if (exact) return exact;
  const matches = cities().filter(c => normalizePlace(c.city) === key);
  return matches.length === 1 ? matches[0] : null;
}
function cityError(value){
  return !String(value || "").trim() || resolveCity(value) ? "" : "Choose a city or town and state from the suggestions, like Washington, DC.";
}
function userLocation(u){
  if (!u) return null;
  if (u.location && typeof u.location.city === "string" && typeof u.location.st === "string") return resolveCity(placeName(u.location));
  // Existing users who supplied a ZIP keep their city without losing saved data.
  const legacy = lookupZip(u.zip || "");
  return legacy ? resolveCity(placeName(legacy)) : null;
}
function cityOptions(value = ""){
  const key = normalizePlace(value);
  const choices = key ? cities().filter(c => normalizePlace(placeName(c)).includes(key)).slice(0, 16) : [resolveCity(orgPlace())].filter(Boolean);
  return choices.map(c => `<option value="${esc(placeName(c))}"></option>`).join("");
}
function cityField(id, value = "", label = "City or town (optional)"){
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" name="location" list="${id}-choices" data-city-input autocomplete="address-level2" maxlength="100" value="${esc(value)}" placeholder="e.g. Washington, DC" aria-describedby="${id}-hint e-location"><datalist id="${id}-choices">${cityOptions(value)}</datalist><span class="muted small" id="${id}-hint">Choose a US city or town. No street address needed.</span><span class="ferr" id="e-location"></span></div>`;
}
