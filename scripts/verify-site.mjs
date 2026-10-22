#!/usr/bin/env node
/**
 * Deterministic verification gate for `Riscon-AI/credit-harvest`
 * (`creditharvest.risconlabs.com` & `hallucgate.risconlabs.com`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const errors = [];

const requiredFiles = [
  "index.html",
  "404.html",
  "worker.js",
  "wrangler.json",
  "package.json",
  "data/treasury-data.json",
];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Missing required file: ${rel}`);
  }
}

const data = JSON.parse(fs.readFileSync(path.join(root, "data/treasury-data.json"), "utf8"));

if (!Array.isArray(data.programs) || data.programs.length !== 8) {
  errors.push(`Expected 8 programs in treasury-data.json, got ${data.programs?.length}`);
}

for (const p of data.programs || []) {
  if (!p.official_url || !p.official_url.startsWith("https://")) {
    errors.push(`Invalid official_url for ${p.program_id}: ${p.official_url}`);
  }
  if (!p.direct_form_url || !p.direct_form_url.startsWith("https://")) {
    errors.push(`Invalid direct_form_url for ${p.program_id}: ${p.direct_form_url}`);
  }
  if (!p.copy_fields?.project_title || !p.copy_fields?.abstract || !p.copy_fields?.full_dossier_markdown) {
    errors.push(`Missing copy_fields in ${p.program_id}`);
  }
}

const siteCount = Object.keys(data.portfolio?.sites || {}).length;
if (siteCount !== 16) {
  errors.push(`Expected 16 live sites in portfolio, got ${siteCount}`);
}

const wrangler = JSON.parse(fs.readFileSync(path.join(root, "wrangler.json"), "utf8"));
const routeDomains = (wrangler.routes || []).map((r) => r.pattern);
if (!routeDomains.includes("creditharvest.risconlabs.com") || !routeDomains.includes("hallucgate.risconlabs.com")) {
  errors.push(`Expected creditharvest.risconlabs.com & hallucgate.risconlabs.com in wrangler.json routes`);
}

if (errors.length > 0) {
  console.error(JSON.stringify({ pass: false, errors }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      pass: true,
      asOf: data.as_of,
      programs: data.programs.length,
      microB2BProducts: data.micro_b2b_products.length,
      portfolioSites: siteCount,
      customDomains: routeDomains,
      errors: 0,
    },
    null,
    2
  )
);
