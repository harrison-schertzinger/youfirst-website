// Regenerates src/content/master-qa.ts from src/content/master-qa.md.
// Run after any edit to the master Q&A:  node scripts/sync-master-qa.mjs
import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync(new URL("../src/content/master-qa.md", import.meta.url), "utf8");
const out = `// AUTO-GENERATED from src/content/master-qa.md — do not edit by hand.
// Regenerate with:  node scripts/sync-master-qa.mjs
// The .md file is the single source of truth for every program fact.

export const MASTER_QA = ${JSON.stringify(md)};
`;
writeFileSync(new URL("../src/content/master-qa.ts", import.meta.url), out);
console.log("master-qa.ts regenerated,", md.length, "chars");
