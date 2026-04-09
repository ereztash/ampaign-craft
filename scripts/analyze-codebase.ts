#!/usr/bin/env npx tsx
// ═══════════════════════════════════════════════
// Codebase Analyzer — Extracts semantic chunks for embedding
// Walks src/, extracts functions/classes/interfaces/components,
// generates a structured JSON index.
// ═══════════════════════════════════════════════
//
// Usage: npx tsx scripts/analyze-codebase.ts > codebase-index.json
//

import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

interface CodeChunk {
  filePath: string;
  chunkType: "function" | "class" | "interface" | "component" | "hook" | "engine" | "type" | "constant";
  chunkName: string;
  content: string;
  metadata: {
    lineStart: number;
    lineEnd: number;
    exports: boolean;
    dependencies: string[];
    params?: string[];
    returnType?: string;
  };
}

interface CodebaseIndex {
  totalFiles: number;
  totalChunks: number;
  chunks: CodeChunk[];
  fileMap: Record<string, string[]>; // file path → chunk names
  generatedAt: string;
}

// ═══════════════════════════════════════════════
// FILE WALKER
// ═══════════════════════════════════════════════

function walkDir(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip node_modules, dist, .git, test files
      if (entry.isDirectory()) {
        if (["node_modules", "dist", ".git", "coverage", "__tests__"].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

// ═══════════════════════════════════════════════
// CHUNK EXTRACTION (Regex-based, no TS Compiler API)
// ═══════════════════════════════════════════════

function extractChunks(filePath: string, content: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const lines = content.split("\n");
  const relativePath = filePath.replace(process.cwd() + "/", "");

  // Determine file type
  const isComponent = relativePath.includes("/components/") || relativePath.endsWith(".tsx");
  const isHook = path.basename(filePath).startsWith("use") && filePath.endsWith(".ts");
  const isEngine = relativePath.includes("Engine") || relativePath.includes("engine/");

  // Extract imports for dependency tracking
  const imports = extractImports(content);

  // Extract exported functions
  const funcRegex = /^(export\s+)?(async\s+)?function\s+(\w+)/gm;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[3];
    const lineStart = content.substring(0, match.index).split("\n").length;
    const body = extractBlock(content, match.index);
    const lineEnd = lineStart + body.split("\n").length - 1;

    let chunkType: CodeChunk["chunkType"] = "function";
    if (isHook && name.startsWith("use")) chunkType = "hook";
    else if (isEngine) chunkType = "engine";

    chunks.push({
      filePath: relativePath,
      chunkType,
      chunkName: name,
      content: body,
      metadata: {
        lineStart,
        lineEnd,
        exports: !!match[1],
        dependencies: imports,
        params: extractParams(body),
      },
    });
  }

  // Extract arrow function exports: export const X = (
  const arrowRegex = /^(export\s+)const\s+(\w+)\s*(?::\s*\w+[^=]*)?\s*=\s*(?:async\s*)?\(/gm;
  while ((match = arrowRegex.exec(content)) !== null) {
    const name = match[2];
    // Skip if already captured as function
    if (chunks.some((c) => c.chunkName === name)) continue;

    const lineStart = content.substring(0, match.index).split("\n").length;
    const body = extractBlock(content, match.index);
    const lineEnd = lineStart + body.split("\n").length - 1;

    let chunkType: CodeChunk["chunkType"] = "function";
    if (isComponent && name[0] === name[0].toUpperCase()) chunkType = "component";
    else if (isHook && name.startsWith("use")) chunkType = "hook";

    chunks.push({
      filePath: relativePath,
      chunkType,
      chunkName: name,
      content: body,
      metadata: {
        lineStart,
        lineEnd,
        exports: true,
        dependencies: imports,
      },
    });
  }

  // Extract interfaces
  const interfaceRegex = /^(export\s+)?interface\s+(\w+)/gm;
  while ((match = interfaceRegex.exec(content)) !== null) {
    const name = match[2];
    const lineStart = content.substring(0, match.index).split("\n").length;
    const body = extractBlock(content, match.index);
    const lineEnd = lineStart + body.split("\n").length - 1;

    chunks.push({
      filePath: relativePath,
      chunkType: "interface",
      chunkName: name,
      content: body,
      metadata: {
        lineStart,
        lineEnd,
        exports: !!match[1],
        dependencies: imports,
      },
    });
  }

  // Extract type aliases
  const typeRegex = /^(export\s+)?type\s+(\w+)\s*=/gm;
  while ((match = typeRegex.exec(content)) !== null) {
    const name = match[2];
    const lineStart = content.substring(0, match.index).split("\n").length;
    // Types are usually single-line or short
    const endIndex = content.indexOf(";", match.index);
    const body = endIndex > -1 ? content.substring(match.index, endIndex + 1) : content.substring(match.index, match.index + 200);

    chunks.push({
      filePath: relativePath,
      chunkType: "type",
      chunkName: name,
      content: body,
      metadata: {
        lineStart,
        lineEnd: lineStart + body.split("\n").length - 1,
        exports: !!match[1],
        dependencies: imports,
      },
    });
  }

  // Extract classes
  const classRegex = /^(export\s+)?class\s+(\w+)/gm;
  while ((match = classRegex.exec(content)) !== null) {
    const name = match[2];
    const lineStart = content.substring(0, match.index).split("\n").length;
    const body = extractBlock(content, match.index);
    const lineEnd = lineStart + body.split("\n").length - 1;

    chunks.push({
      filePath: relativePath,
      chunkType: "class",
      chunkName: name,
      content: body,
      metadata: {
        lineStart,
        lineEnd,
        exports: !!match[1],
        dependencies: imports,
      },
    });
  }

  return chunks;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*?from\s+["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractParams(body: string): string[] {
  const match = body.match(/\(([^)]*)\)/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => p.split(":")[0].trim().replace(/[?=].*/, ""));
}

function extractBlock(content: string, startIndex: number): string {
  let braceCount = 0;
  let inBlock = false;
  let i = startIndex;

  while (i < content.length) {
    const char = content[i];

    if (char === "{") {
      braceCount++;
      inBlock = true;
    } else if (char === "}") {
      braceCount--;
      if (inBlock && braceCount === 0) {
        return content.substring(startIndex, i + 1);
      }
    }

    i++;

    // Safety: don't extract more than 5000 chars
    if (i - startIndex > 5000) break;
  }

  // Fallback: return until next blank line or 500 chars
  const end = content.indexOf("\n\n", startIndex);
  if (end > startIndex) return content.substring(startIndex, end);
  return content.substring(startIndex, startIndex + 500);
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

function main() {
  const srcDir = path.resolve(process.cwd(), "src");

  if (!fs.existsSync(srcDir)) {
    console.error("Error: src/ directory not found");
    process.exit(1);
  }

  const files = walkDir(srcDir, [".ts", ".tsx"]);
  const allChunks: CodeChunk[] = [];
  const fileMap: Record<string, string[]> = {};

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const chunks = extractChunks(file, content);
    allChunks.push(...chunks);
    fileMap[file.replace(process.cwd() + "/", "")] = chunks.map((c) => c.chunkName);
  }

  const index: CodebaseIndex = {
    totalFiles: files.length,
    totalChunks: allChunks.length,
    chunks: allChunks,
    fileMap,
    generatedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(index, null, 2));
}

main();
