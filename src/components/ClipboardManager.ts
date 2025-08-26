export class ClipboardManager {
  static async copyTranslationOnClick(
    textToTranslate: string,
    element: HTMLElement,
    translations: Record<string, unknown>
  ): Promise<void> {
    const allTranslations = this.findAllTranslations(
      textToTranslate,
      translations
    );

    if (allTranslations.length > 0) {
      const translation = this.formatMultipleTranslations(allTranslations);
      const cleanTranslation = translation.replace(/⏪\s*/g, "");

      try {
        await navigator.clipboard.writeText(cleanTranslation);
        this.showClickFeedback(element);
        this.showCopyNotification(cleanTranslation);
      } catch (error) {
        console.error("❌ Erreur lors de la copie :", error);
        this.fallbackCopyToClipboard(cleanTranslation);
        this.showClickFeedback(element);
      }
    }
  }

  private static findAllTranslations(
    text: string,
    translations: Record<string, unknown>
  ): Array<{
    translation: string;
    matchedKey: string;
    isReverse: boolean;
  }> {
    const normalizedText = text.toLowerCase().trim().replace(/\s+/g, " ");
    const allMatches: Array<{
      translation: string;
      matchedKey: string;
      isReverse: boolean;
    }> = [];

    const findInObject = (
      obj: Record<string, unknown>,
      searchText: string
    ): void => {
      for (const [key, value] of Object.entries(obj)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, " ");

        if (normalizedKey === searchText) {
          allMatches.push({
            translation:
              typeof value === "string" ? value : JSON.stringify(value),
            matchedKey: key,
            isReverse: false,
          });
        }

        if (typeof value === "string") {
          const normalizedValue = value
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
          if (normalizedValue === searchText) {
            allMatches.push({
              translation: key,
              matchedKey: value,
              isReverse: true,
            });
          }
        }

        if (typeof value === "object" && value !== null) {
          findInObject(value as Record<string, unknown>, searchText);
        }
      }
    };

    findInObject(translations, normalizedText);
    return allMatches;
  }

  private static formatMultipleTranslations(
    allTranslations: Array<{
      translation: string;
      matchedKey: string;
      isReverse: boolean;
    }>
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

  private static showClickFeedback(element: HTMLElement): void {
    const originalBackground = element.style.backgroundColor;
    const originalColor = element.style.color;
    const originalTransform = element.style.transform;
    const originalTransition = element.style.transition;

    element.style.transition = "all 0.3s ease";
    element.style.backgroundColor = "#4caf50";
    element.style.color = "white";
    element.style.transform = "scale(1.1)";

    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
      element.style.color = originalColor;
      element.style.transform = originalTransform;
      element.style.transition = originalTransition;
    }, 1500);
  }

  private static showCopyNotification(translation: string): void {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
      z-index: 10002;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    notification.textContent = `Traduction copiée : ${translation}`;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  private static fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      this.showCopyNotification(text);
    } catch (error) {
      console.error("❌ Erreur lors de la copie fallback :", error);
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
