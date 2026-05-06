// Data import engine boundary: re-exports functions that components need.
// Components must import from here, never from @/engine/* directly.

export { detectSchema, parseXlsxFile, validateDataset } from "@/engine/dataImportEngine";
