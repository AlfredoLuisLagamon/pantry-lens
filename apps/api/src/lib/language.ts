import { AppError } from "../errors/AppError";

export const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function parseLanguage(raw: unknown): SupportedLanguage {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return "en";
  }

  const lang = String(raw).trim().toLowerCase();
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      `Unsupported language '${lang}'. Allowed values: en, nl, de, fr.`,
    );
  }

  return lang as SupportedLanguage;
}

export function parseSearchQuery(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new AppError(400, "VALIDATION_ERROR", "Query parameter 'q' is required.");
  }

  const query = raw.trim();
  if (query.length < 2) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Query parameter 'q' must be at least 2 characters.",
    );
  }

  if (query.length > 100) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Query parameter 'q' must be at most 100 characters.",
    );
  }

  return query;
}

export function parsePage(raw: unknown): number {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return 1;
  }

  const page = Number(raw);
  if (!Number.isInteger(page) || page < 1 || page > 100) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Query parameter 'page' must be an integer between 1 and 100.",
    );
  }

  return page;
}

/** Conservative barcode check covering common EAN/UPC lengths without blocking typical OFF codes. */
export function parseBarcode(raw: string): string {
  const barcode = raw.trim();
  if (!/^\d{8,18}$/.test(barcode)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Barcode must be 8–18 digits.",
    );
  }
  return barcode;
}
