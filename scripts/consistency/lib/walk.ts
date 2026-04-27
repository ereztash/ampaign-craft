import * as fs from "fs";
import * as path from "path";

export function walk(dir: string, extRe: RegExp, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, extRe, acc);
    } else if (entry.isFile() && extRe.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

export function walkDirs(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) acc.push(entry.name);
  }
  return acc;
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
