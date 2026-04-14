/**
 * codemod-tx.mjs
 *
 * Transforms inline bilingual ternaries to tx() calls:
 *   isHe ? "HEBREW" : "ENGLISH"
 *   → tx({ he: "HEBREW", en: "ENGLISH" }, language)
 *
 * Also handles template-literal strings:
 *   isHe ? `HEBREW ${expr}` : `ENGLISH ${expr}`
 *   → tx({ he: `HEBREW ${expr}`, en: `ENGLISH ${expr}` }, language)
 *
 * Adds `import { tx } from "@/i18n/tx"` when absent.
 * Skips AppSidebar.tsx (uses isRTL, not language).
 * Dry-run mode: node scripts/codemod-tx.mjs --dry
 */

import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const DRY = process.argv.includes("--dry");
const SKIP = new Set(["src/components/AppSidebar.tsx", "src/i18n/tx.ts"]);

// Match: isHe ? "..." : "..."  (double-quoted, no unescaped quote inside)
const DQ = `"[^"\\\\]*(?:\\\\.[^"\\\\]*)*"`;
// Match: isHe ? `...` : `...`  (backtick, handles ${...} inside)
const BT = "`[^`]*`";
const STR = `(?:${DQ}|${BT})`;

// Pattern 1: inline string literals
const RE = new RegExp(`isHe \\? (${STR}) : (${STR})`, "g");

// Pattern 2: isHe ? expr.he : expr.en  →  tx(expr, language)
// Uses backreference to ensure expr is identical on both sides.
// expr = word chars, dots, brackets (covers identifiers and member expressions)
const RE_OBJ = /isHe \? ([\w.[\]]+)\.he : \1\.en/g;

let totalFiles = 0;
let totalReplaced = 0;

const files = globSync("src/**/*.{ts,tsx}");

for (const file of files) {
  if (SKIP.has(file)) continue;

  const original = readFileSync(file, "utf8");
  let content = original;
  let count = 0;

  content = content.replace(RE, (_match, he, en) => {
    count++;
    return `tx({ he: ${he}, en: ${en} }, language)`;
  });

  // Pattern 2: isHe ? expr.he : expr.en
  content = content.replace(RE_OBJ, (_match, expr) => {
    count++;
    return `tx(${expr}, language)`;
  });

  if (count === 0) continue;

  // Ensure tx is imported
  if (!content.includes('from "@/i18n/tx"') && !content.includes("from '@/i18n/tx'")) {
    // Insert after the last @/ import line
    content = content.replace(
      /(import [^\n]+ from "@\/[^"]+";?\n)(?!import [^\n]+ from "@\/)/,
      (m) => m + `import { tx } from "@/i18n/tx";\n`,
    );
  }

  totalFiles++;
  totalReplaced += count;

  if (DRY) {
    console.log(`[dry] ${file}: ${count} replacement(s)`);
  } else {
    writeFileSync(file, content, "utf8");
    console.log(`${file}: ${count} replacement(s)`);
  }
}

console.log(`\nDone — ${totalReplaced} replacements across ${totalFiles} file(s).`);
