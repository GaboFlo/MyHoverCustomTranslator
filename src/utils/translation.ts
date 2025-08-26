import type { TranslationData, TranslationMatch } from "../types";
import { DomUtils } from "./dom";

export class TranslationUtils {
  static findAllTranslations(
    text: string,
    translations: TranslationData
  ): TranslationMatch[] {
    const normalizedText = text.toLowerCase().trim().replace(/\s+/g, " ");
    const allMatches: TranslationMatch[] = [];

    const findInObject = (obj: TranslationData, searchText: string): void => {
      for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, " ");

        if (normalizedKey === searchText) {
          const position = searchText.indexOf(normalizedKey);
          allMatches.push({
            translation:
              typeof value === "string" ? value : JSON.stringify(value),
            matchedKey: key,
            isReverse: false,
            position: position >= 0 ? position : 0,
          });
        }

        if (typeof value === "string") {
          const normalizedValue = value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          if (normalizedValue === searchText) {
            const position = searchText.indexOf(normalizedValue);
            allMatches.push({
              translation: key,
              matchedKey: value,
              isReverse: true,
              position: position >= 0 ? position : 0,
            });
          }
        }

        if (searchText.includes(normalizedKey) && normalizedKey.length > 2) {
          const position = searchText.indexOf(normalizedKey);
          allMatches.push({
            translation:
              typeof value === "string" ? value : JSON.stringify(value),
            matchedKey: key,
            isReverse: false,
            position: position >= 0 ? position : 0,
          });
        }

        if (typeof value === "string") {
          const normalizedValue = value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          if (
            searchText.includes(normalizedValue) &&
            normalizedValue.length > 2
          ) {
            const position = searchText.indexOf(normalizedValue);
            allMatches.push({
              translation: key,
              matchedKey: value,
              isReverse: true,
              position: position >= 0 ? position : 0,
            });
          }
        }

        if (typeof value === "object" && value !== null) {
          findInObject(value as TranslationData, searchText);
        }
      }
    };

    findInObject(translations, normalizedText);
    return allMatches.sort((a, b) => a.position - b.position);
  }

  static formatMultipleTranslations(
    allTranslations: TranslationMatch[]
  ): string {
    if (allTranslations.length === 1 && allTranslations[0]) {
      const translation = allTranslations[0];
      return translation.isReverse
        ? `⏪ ${translation.translation}`
        : translation.translation;
    }

    const normalTranslations = allTranslations
      .filter((t) => !t.isReverse)
      .map((t) => t.translation);
    const reverseTranslations = allTranslations
      .filter((t) => t.isReverse)
      .map((t) => t.translation);

    const uniqueNormalTranslations = [...new Set(normalTranslations)];
    const uniqueReverseTranslations = [...new Set(reverseTranslations)];

    const parts: string[] = [];

    if (uniqueNormalTranslations.length > 0) {
      parts.push(uniqueNormalTranslations.join(" | "));
    }

    if (uniqueReverseTranslations.length > 0) {
      parts.push(`⏪ ${uniqueReverseTranslations.join(" | ")}`);
    }

    return parts.join(" | ");
  }

  static highlightMultipleMatchedTexts(
    element: HTMLElement,
    fullText: string,
    allTranslations: TranslationMatch[]
  ): void {
    const originalContent = element.innerHTML;
    let highlightedContent = fullText;

    const matchesToHighlight = allTranslations.map((translation, index) => {
      const colors = [
        { bg: "#ffeb3b", text: "#000" },
        { bg: "#4caf50", text: "#fff" },
        { bg: "#ff9800", text: "#fff" },
        { bg: "#e91e63", text: "#fff" },
        { bg: "#9c27b0", text: "#fff" },
      ];
      const color = colors[index % colors.length] || colors[0];

      return {
        key: translation.matchedKey,
        isReverse: translation.isReverse,
        color: color,
        position: translation.position,
        translation: translation.translation,
      };
    });

    matchesToHighlight.sort((a, b) => a.position - b.position);

    matchesToHighlight.forEach((match) => {
      if (match.color) {
        const regex = new RegExp(`(${DomUtils.escapeRegExp(match.key)})`, "gi");

        highlightedContent = highlightedContent.replace(
          regex,
          `<span data-hover-translator-highlight="true" style="background-color: ${match.color.bg}; color: ${match.color.text}; padding: 1px 2px; border-radius: 2px; font-weight: bold; cursor: pointer;">$1</span>`
        );
      }
    });

    DomUtils.setElementHtml(element, highlightedContent);
    element.setAttribute("data-original-content", originalContent);
  }

  static shouldTranslateOnPage(targetUrls: string[]): boolean {
    if (targetUrls.length === 0) {
      return true;
    }

    const currentUrl = window.location.href;
    const currentDomain = new URL(currentUrl).hostname;

    return targetUrls.some((url) => {
      if (url.startsWith("*://")) {
        const pattern = url.replace("*://", "");
        return currentDomain.includes(pattern);
      }
      return currentDomain === url || currentDomain.includes(url);
    });
  }
}
