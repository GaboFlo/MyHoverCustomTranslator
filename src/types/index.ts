export interface TranslationData {
  [key: string]: string | TranslationData | unknown;
}

export interface Settings {
  translations?: TranslationData;
  targetUrls?: string[];
  isEnabled?: boolean;
  delay?: number;
  translationPartsCount?: number;
  siteSettings?: { [domain: string]: SiteSettings };
}

// @ts-prune-ignore-next-line
export interface SiteSettings {
  highlightAllWords?: boolean;
}

export interface TranslationMatch {
  translation: string;
  matchedKey: string;
  isReverse: boolean;
  position: number;
}

export interface SearchMatch {
  element: HTMLElement;
  text: string;
  translation: string;
  isReverse: boolean;
}

export interface ExportData {
  translations?: TranslationData;
  targetUrls?: string[];
  isEnabled?: boolean;
  delay?: number;
  version: string;
  exportDate: string;
}
