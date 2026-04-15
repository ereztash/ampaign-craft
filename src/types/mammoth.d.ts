// Minimal type shim for mammoth — only the APIs we actually use.
// Upstream package does not ship TS types; DefinitelyTyped package exists
// but is optional. We declare just the slice we need.

declare module "mammoth" {
  export interface ExtractRawTextInput {
    arrayBuffer: ArrayBuffer;
  }

  export interface ExtractRawTextMessage {
    type: string;
    message: string;
  }

  export interface ExtractRawTextResult {
    value: string;
    messages: ExtractRawTextMessage[];
  }

  export function extractRawText(input: ExtractRawTextInput): Promise<ExtractRawTextResult>;
}
