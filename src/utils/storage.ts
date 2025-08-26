import type { Settings, TranslationData } from "../types";

export class StorageManager {
  static async loadSettings(): Promise<Settings> {
    try {
      const result = (await chrome.storage.sync.get([
        "translations",
        "targetUrls",
        "isEnabled",
        "delay",
        "translationPartsCount",
        "siteSettings",
      ])) as Settings;

      let translations: TranslationData = {};

      if (result.translationPartsCount && result.translationPartsCount > 0) {
        const partKeys = Array.from(
          { length: result.translationPartsCount },
          (_, i) => `translationPart_${i}`
        );

        const parts = await chrome.storage.sync.get(partKeys);

        for (let i = 0; i < result.translationPartsCount; i++) {
          const partKey = `translationPart_${i}`;
          if (parts[partKey]) {
            translations = { ...translations, ...parts[partKey] };
          }
        }
      } else {
        translations = result.translations || {};
      }

      return {
        translations,
        targetUrls: result.targetUrls || [],
        isEnabled: result.isEnabled !== false,
        delay: result.delay || 300,
        siteSettings: result.siteSettings || {},
      };
    } catch (error) {
      console.error("❌ Erreur lors du chargement des paramètres:", error);
      return {
        translations: {},
        targetUrls: [],
        isEnabled: true,
        delay: 300,
        siteSettings: {},
      };
    }
  }

  static async saveSettings(settings: Settings): Promise<void> {
    try {
      const translationsSize = new Blob([
        JSON.stringify(settings.translations || {}),
      ]).size;
      const maxSize = 6000;

      await this.cleanupOldTranslationParts();

      if (translationsSize > maxSize) {
        const translationParts = this.splitTranslations(
          settings.translations || {},
          maxSize
        );
        const saveSettings = {
          targetUrls: settings.targetUrls,
          isEnabled: settings.isEnabled,
          delay: settings.delay,
          translationPartsCount: translationParts.length,
          siteSettings: settings.siteSettings,
        };

        const savePromises = translationParts.map((part, index) =>
          chrome.storage.sync.set({ [`translationPart_${index}`]: part })
        );

        await Promise.all([
          chrome.storage.sync.set(saveSettings as { [key: string]: unknown }),
          ...savePromises,
        ]);
      } else {
        await chrome.storage.sync.set(settings as { [key: string]: unknown });
      }
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      throw error;
    }
  }

  private static splitTranslations(
    translations: TranslationData,
    maxSize: number
  ): TranslationData[] {
    const parts: TranslationData[] = [];
    let currentPart: TranslationData = {};
    let currentSize = 0;

    for (const [key, value] of Object.entries(translations)) {
      const itemJson = JSON.stringify({ [key]: value });
      const itemSize = new Blob([itemJson]).size;

      if (itemSize > maxSize) {
        if (Object.keys(currentPart).length > 0) {
          parts.push(currentPart);
          currentPart = {};
          currentSize = 0;
        }
        parts.push({ [key]: value });
        continue;
      }

      if (
        currentSize + itemSize > maxSize &&
        Object.keys(currentPart).length > 0
      ) {
        parts.push(currentPart);
        currentPart = {};
        currentSize = 0;
      }

      currentPart[key] = value;
      currentSize += itemSize;
    }

    if (Object.keys(currentPart).length > 0) {
      parts.push(currentPart);
    }

    return parts;
  }

  private static async cleanupOldTranslationParts(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(["translationPartsCount"]);

      if (
        result["translationPartsCount"] &&
        result["translationPartsCount"] > 0
      ) {
        const keysToRemove = Array.from(
          { length: result["translationPartsCount"] },
          (_, i) => `translationPart_${i}`
        );

        await chrome.storage.sync.remove([
          ...keysToRemove,
          "translationPartsCount",
        ]);
      }
    } catch (error) {
      console.warn("⚠️ Erreur lors du nettoyage des anciennes parties:", error);
    }
  }
}
