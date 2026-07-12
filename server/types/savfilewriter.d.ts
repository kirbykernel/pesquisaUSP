declare module "savfilewriter" {
  export interface SavVariable {
    name: string;
    type: number; // 0 = numeric, N = string width in bytes
    label?: string;
    printFormat?: string;
    writeFormat?: string;
    values?: Record<string, string>;
  }

  export interface SavMetadata {
    encoding?: string;
    fileLabel?: string;
    sysvars: SavVariable[];
  }

  export interface SavWriteOptions {
    product?: string;
    compression?: number;
  }

  export const SavWriter: {
    write(
      metadata: SavMetadata,
      records: Record<string, string | number | null | undefined>[],
      options?: SavWriteOptions
    ): ArrayBuffer;

    download(
      metadata: SavMetadata,
      records: Record<string, string | number | null | undefined>[],
      filename: string,
      options?: SavWriteOptions
    ): void;
  };

  export const BinaryWriter: unknown;
  export const version: string;
  export const name: string;
}
