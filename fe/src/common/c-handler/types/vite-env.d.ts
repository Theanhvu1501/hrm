interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;

  glob<T = unknown>(
    pattern: string | string[],
    options?: {
      eager?: boolean;

      as?: "raw" | "url";

      query?: Record<string, string | number | boolean>;
    }
  ): Record<string, T>;
}
