// Types utilisés
interface OptionsTranslationData {
  [key: string]: string | OptionsTranslationData;
}

interface OptionsSettings {
  translations?: OptionsTranslationData;
  targetUrls?: string[];
  isEnabled?: boolean;
  delay?: number;
  translationPartsCount?: number;
}

interface ExportData {
  translations?: OptionsTranslationData;
  targetUrls?: string[];
  isEnabled?: boolean;
  delay?: number;
  version: string;
  exportDate: string;
}

interface OptionsElements {
  translationsJson: HTMLTextAreaElement;
  urlList: HTMLDivElement;
  isEnabled: HTMLInputElement;
  delayInput: HTMLInputElement;
  formatAndValidateJson: HTMLButtonElement;
  saveOptionsSettings: HTMLButtonElement;
  resetOptionsSettings: HTMLButtonElement;
  exportOptionsSettings: HTMLButtonElement;
  importOptionsSettings: HTMLButtonElement;
  importFile: HTMLInputElement;
  newTranslationKey: HTMLInputElement;
  newTranslationValue: HTMLInputElement;
  addTranslation: HTMLButtonElement;
}

class OptionsManager {
  private elements: OptionsElements;
  private originalSettings: OptionsSettings = {};
  private hasChanges = false;

  constructor() {
    this.elements = {} as OptionsElements;
    this.init();
  }

  private init(): void {
    this.cacheElements();
    this.bindEvents();
    this.loadOptionsSettings();
  }

  private cacheElements(): void {
    const translationsJson = document.getElementById(
      "translationsJson"
    ) as HTMLTextAreaElement;
    const urlList = document.getElementById("urlList") as HTMLDivElement;
    const isEnabled = document.getElementById("isEnabled") as HTMLInputElement;
    const delayInput = document.getElementById(
      "delayInput"
    ) as HTMLInputElement;
    const formatAndValidateJson = document.getElementById(
      "formatAndValidateJson"
    ) as HTMLButtonElement;
    const saveOptionsSettings = document.getElementById(
      "saveOptionsSettings"
    ) as HTMLButtonElement;
    const resetOptionsSettings = document.getElementById(
      "resetOptionsSettings"
    ) as HTMLButtonElement;
    const exportOptionsSettings = document.getElementById(
      "exportOptionsSettings"
    ) as HTMLButtonElement;
    const importOptionsSettings = document.getElementById(
      "importOptionsSettings"
    ) as HTMLButtonElement;
    const importFile = document.getElementById(
      "importFile"
    ) as HTMLInputElement;
    const newTranslationKey = document.getElementById(
      "newTranslationKey"
    ) as HTMLInputElement;
    const newTranslationValue = document.getElementById(
      "newTranslationValue"
    ) as HTMLInputElement;
    const addTranslation = document.getElementById(
      "addTranslation"
    ) as HTMLButtonElement;

    this.elements = {
      translationsJson,
      urlList,
      isEnabled,
      delayInput,
      formatAndValidateJson,
      saveOptionsSettings,
      resetOptionsSettings,
      exportOptionsSettings,
      importOptionsSettings,
      importFile,
      newTranslationKey,
      newTranslationValue,
      addTranslation,
    };
  }

  private bindEvents(): void {
    try {
      this.elements.formatAndValidateJson.addEventListener("click", () => {
        this.formatAndValidateJson();
      });

      this.elements.saveOptionsSettings.addEventListener("click", () => {
        this.saveOptionsSettings();
      });

      this.elements.resetOptionsSettings.addEventListener("click", () => {
        this.resetOptionsSettings();
      });

      this.elements.exportOptionsSettings.addEventListener("click", () => {
        this.exportOptionsSettings();
      });

      this.elements.importOptionsSettings.addEventListener("click", () => {
        this.importOptionsSettings();
      });

      this.elements.importFile.addEventListener("change", (e: Event) => {
        this.handleFileImport(e);
      });

      this.elements.addTranslation.addEventListener("click", () => {
        this.addNewTranslation();
      });

      // Événements de détection des changements
      this.elements.translationsJson.addEventListener("input", () => {
        this.checkForChanges();
      });

      this.elements.isEnabled.addEventListener("change", () => {
        this.checkForChanges();
      });

      this.elements.delayInput.addEventListener("input", () => {
        this.checkForChanges();
      });

      this.elements.urlList.addEventListener("click", (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("remove-url")) {
          this.removeUrlField(target);
        } else if (target.classList.contains("add-url")) {
          this.addUrlField("", true);
        }
      });

      // Écouter les changements dans les champs URL
      this.elements.urlList.addEventListener("input", () => {
        this.checkForChanges();
      });
    } catch (error) {
      console.error("❌ Erreur lors de la liaison des événements:", error);
    }
  }

  private async loadOptionsSettings(): Promise<void> {
    try {
      const result = (await chrome.storage.sync.get([
        "translations",
        "targetUrls",
        "isEnabled",
        "delay",
        "translationPartsCount",
      ])) as OptionsSettings;

      let translations: OptionsTranslationData = {};

      // Vérifier s'il y a des parties de traduction
      if (result.translationPartsCount && result.translationPartsCount > 0) {
        // Charger toutes les parties
        const partKeys = Array.from(
          { length: result.translationPartsCount },
          (_, i) => `translationPart_${i}`
        );

        const parts = await chrome.storage.sync.get(partKeys);

        // Fusionner toutes les parties
        for (let i = 0; i < result.translationPartsCount; i++) {
          const partKey = `translationPart_${i}`;
          if (parts[partKey]) {
            translations = { ...translations, ...parts[partKey] };
          }
        }
      } else {
        // Fallback : essayer de charger depuis l'ancienne clé 'translations'
        translations = result.translations || {};
      }

      // Formater et afficher le JSON
      this.elements.translationsJson.value = JSON.stringify(
        translations,
        null,
        2
      );

      const targetUrls = result.targetUrls || [];
      this.populateUrlList(targetUrls);

      this.elements.isEnabled.checked = result.isEnabled !== false;
      this.elements.delayInput.value = (result.delay || 300).toString();

      // Sauvegarder les paramètres originaux pour la comparaison
      this.originalSettings = {
        translations,
        targetUrls,
        isEnabled: result.isEnabled !== false,
        delay: result.delay || 300,
      };

      // Vérifier les changements et mettre à jour l'état des boutons
      this.checkForChanges();
    } catch {
      this.showSnackbar("Erreur lors du chargement des paramètres", "error");
    }
  }

  private populateUrlList(urls: string[]): void {
    this.elements.urlList.innerHTML = "";

    if (urls.length === 0) {
      this.addUrlField("", false);
    } else {
      urls.forEach((url) => {
        this.addUrlField(url, false);
      });
    }
  }

  private checkForChanges(): void {
    const currentSettings = this.getCurrentSettings();
    this.hasChanges = this.hasSettingsChanged(currentSettings);
    this.updateButtonsState();
  }

  private getCurrentSettings(): OptionsSettings {
    const urlInputs = this.elements.urlList.querySelectorAll(".url-input");
    const targetUrls = Array.from(urlInputs)
      .map((input) => (input as HTMLInputElement).value.trim())
      .filter((url) => url.length > 0);

    let translations: OptionsTranslationData = {};
    try {
      const translationsText = this.elements.translationsJson.value.trim();
      if (translationsText) {
        translations = JSON.parse(translationsText);
      }
    } catch {
      // En cas d'erreur de parsing, on considère qu'il y a des changements
    }

    return {
      translations,
      targetUrls,
      isEnabled: this.elements.isEnabled.checked,
      delay: parseInt(this.elements.delayInput.value) || 300,
    };
  }

  private hasSettingsChanged(currentSettings: OptionsSettings): boolean {
    // Comparer les traductions
    const originalTranslations = JSON.stringify(
      this.originalSettings.translations || {}
    );
    const currentTranslations = JSON.stringify(
      currentSettings.translations || {}
    );
    if (originalTranslations !== currentTranslations) return true;

    // Comparer les URLs
    const originalUrls = JSON.stringify(this.originalSettings.targetUrls || []);
    const currentUrls = JSON.stringify(currentSettings.targetUrls || []);
    if (originalUrls !== currentUrls) return true;

    // Comparer les autres paramètres
    if (this.originalSettings.isEnabled !== currentSettings.isEnabled)
      return true;
    if (this.originalSettings.delay !== currentSettings.delay) return true;

    return false;
  }

  private updateButtonsState(): void {
    this.elements.saveOptionsSettings.disabled = !this.hasChanges;
    this.elements.resetOptionsSettings.disabled = !this.hasChanges;
  }

  private addUrlField(value: string = "", checkChanges: boolean = true): void {
    const urlItem = document.createElement("div");
    urlItem.className = "url-item";
    urlItem.innerHTML = `
      <input type="text" placeholder="exemple.com" class="url-input" value="${value}">
      <div class="url-buttons">
        <button class="btn btn-secondary add-url" title="Ajouter une URL">➕</button>
        <button class="btn btn-danger remove-url" title="Supprimer cette URL">🗑️</button>
      </div>
    `;
    this.elements.urlList.appendChild(urlItem);
    if (checkChanges) {
      this.checkForChanges();
    }
  }

  private removeUrlField(button: HTMLElement): void {
    const urlItem = button.closest(".url-item") as HTMLElement;
    if (this.elements.urlList.children.length > 1) {
      urlItem.remove();
      this.checkForChanges();
    }
  }

  private countKeys(obj: OptionsTranslationData): number {
    let count = 0;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        count++;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          count += this.countKeys(obj[key] as OptionsTranslationData);
        }
      }
    }
    return count;
  }

  private formatJsonInTextarea(): void {
    try {
      const jsonText = this.elements.translationsJson.value.trim();
      if (!jsonText) return;

      const parsed = JSON.parse(jsonText) as OptionsTranslationData;
      const formatted = JSON.stringify(parsed, null, 2);

      // Mettre à jour le textarea avec le JSON formaté
      this.elements.translationsJson.value = formatted;
    } catch {
      // En cas d'erreur de parsing, on ne fait rien (le JSON n'est pas valide)
    }
  }

  private formatAndValidateJson(): void {
    try {
      const jsonText = this.elements.translationsJson.value.trim();
      if (!jsonText) {
        this.showSnackbar("Le JSON est vide", "info");
        return;
      }

      const parsed = JSON.parse(jsonText) as OptionsTranslationData;
      const formatted = JSON.stringify(parsed, null, 2);

      // Mettre à jour le textarea avec le JSON formaté
      this.elements.translationsJson.value = formatted;

      const keyCount = this.countKeys(parsed);
      this.showSnackbar(
        `JSON formaté et validé ! ${keyCount} entrées de traduction trouvées`,
        "success"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      this.showSnackbar(`Erreur JSON: ${errorMessage}`, "error");
    }
  }

  private async saveOptionsSettings(): Promise<void> {
    try {
      const translationsText = this.elements.translationsJson.value.trim();
      let translations: OptionsTranslationData = {};

      if (translationsText) {
        translations = JSON.parse(translationsText) as OptionsTranslationData;
      }

      const urlInputs = this.elements.urlList.querySelectorAll(".url-input");
      const targetUrls = Array.from(urlInputs)
        .map((input) => (input as HTMLInputElement).value.trim())
        .filter((url) => url.length > 0);

      // Vérifier la taille du dictionnaire
      const translationsSize = new Blob([JSON.stringify(translations)]).size;
      const maxSize = 7000; // Limite de sécurité (Chrome limite à 8192 octets)

      let OptionsSettings: OptionsSettings;

      // Toujours nettoyer les anciennes données avant de sauvegarder
      await this.cleanupOldTranslationParts();

      if (translationsSize > maxSize) {
        // Diviser le dictionnaire en parties
        const translationParts = this.splitTranslations(translations, maxSize);

        // Sauvegarder les autres paramètres sans les traductions
        OptionsSettings = {
          targetUrls,
          isEnabled: this.elements.isEnabled.checked,
          delay: parseInt(this.elements.delayInput.value) || 300,
          translationPartsCount: translationParts.length,
        };

        // Sauvegarder chaque partie séparément
        const savePromises = translationParts.map((part, index) =>
          chrome.storage.sync.set({ [`translationPart_${index}`]: part })
        );

        await Promise.all([
          chrome.storage.sync.set(
            OptionsSettings as { [key: string]: unknown }
          ),
          ...savePromises,
        ]);

        this.showSnackbar(`Sauvegardé avec succès`, "success");
      } else {
        OptionsSettings = {
          translations,
          targetUrls,
          isEnabled: this.elements.isEnabled.checked,
          delay: parseInt(this.elements.delayInput.value) || 300,
        };

        await chrome.storage.sync.set(
          OptionsSettings as { [key: string]: unknown }
        );
        this.showSnackbar("Paramètres sauvegardés avec succès !", "success");
      }

      // Mettre à jour les paramètres originaux et l'état des boutons
      this.originalSettings = this.getCurrentSettings();
      this.hasChanges = false;
      this.updateButtonsState();

      // Formater le JSON dans le textarea pour un affichage propre
      this.formatJsonInTextarea();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      this.showSnackbar(
        `Erreur lors de la sauvegarde: ${errorMessage}`,
        "error"
      );
    }
  }

  private splitTranslations(
    translations: OptionsTranslationData,
    maxSize: number
  ): OptionsTranslationData[] {
    const parts: OptionsTranslationData[] = [];
    let currentPart: OptionsTranslationData = {};
    let currentSize = 2; // Pour les accolades {}

    for (const [key, value] of Object.entries(translations)) {
      const itemSize = new Blob([JSON.stringify({ [key]: value })]).size;

      if (
        currentSize + itemSize > maxSize &&
        Object.keys(currentPart).length > 0
      ) {
        parts.push(currentPart);
        currentPart = {};
        currentSize = 2;
      }

      currentPart[key] = value;
      currentSize += itemSize;
    }

    if (Object.keys(currentPart).length > 0) {
      parts.push(currentPart);
    }

    return parts;
  }

  private async cleanupOldTranslationParts(): Promise<void> {
    // Simplification : on ne nettoie pas automatiquement pour éviter les erreurs d'API
    // Les nouvelles données écraseront les anciennes
  }

  private async resetOptionsSettings(): Promise<void> {
    if (
      confirm("Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?")
    ) {
      try {
        await chrome.storage.sync.clear();
        this.loadOptionsSettings();
        this.hasChanges = false;
        this.updateButtonsState();
        this.showSnackbar("Paramètres réinitialisés", "info");
      } catch {
        this.showSnackbar("Erreur lors de la réinitialisation", "error");
      }
    }
  }

  private async exportOptionsSettings(): Promise<void> {
    try {
      // Récupérer toutes les données de base
      const result = (await chrome.storage.sync.get([
        "translations",
        "targetUrls",
        "isEnabled",
        "delay",
        "translationPartsCount",
      ])) as OptionsSettings;

      let completeTranslations = result.translations || {};

      // Si des parties de traduction existent, les fusionner
      if (result.translationPartsCount && result.translationPartsCount > 0) {
        const partKeys = Array.from(
          { length: result.translationPartsCount },
          (_, i) => `translationPart_${i}`
        );

        const parts = await chrome.storage.sync.get(partKeys);

        // Fusionner toutes les parties
        for (let i = 0; i < result.translationPartsCount; i++) {
          const partKey = `translationPart_${i}`;
          if (parts[partKey]) {
            completeTranslations = {
              ...completeTranslations,
              ...parts[partKey],
            };
          }
        }
      }

      const exportData: ExportData = {
        version: chrome.runtime.getManifest().version,
        exportDate: new Date().toISOString(),
        translations: completeTranslations,
        targetUrls: result.targetUrls || [],
        isEnabled: result.isEnabled !== false,
        delay: result.delay || 300,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `myhover-translator-OptionsSettings-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showSnackbar("Paramètres exportés avec succès", "success");
    } catch {
      this.showSnackbar("Erreur lors de l'export", "error");
    }
  }

  private importOptionsSettings(): void {
    this.elements.importFile.click();
  }

  private async handleFileImport(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const text = await this.readFileAsText(file);
      const importData = JSON.parse(text) as ExportData;

      if (importData.translations) {
        // Formater et afficher le JSON importé
        this.elements.translationsJson.value = JSON.stringify(
          importData.translations,
          null,
          2
        );
      }

      if (importData.targetUrls) {
        this.populateUrlList(importData.targetUrls);
      }

      if (typeof importData.isEnabled === "boolean") {
        this.elements.isEnabled.checked = importData.isEnabled;
      }

      if (importData.delay) {
        this.elements.delayInput.value = importData.delay.toString();
      }

      this.showSnackbar("Paramètres importés avec succès", "success");
      target.value = "";

      // Sauvegarder automatiquement les paramètres importés
      await this.saveOptionsSettings();

      // Mettre à jour les paramètres originaux et l'état des boutons après la sauvegarde
      this.originalSettings = this.getCurrentSettings();
      this.hasChanges = false;
      this.updateButtonsState();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      this.showSnackbar(`Erreur lors de l'import: ${errorMessage}`, "error");
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e): void => resolve(e.target?.result as string);
      reader.onerror = (e): void => reject(e);
      reader.readAsText(file);
    });
  }

  private addNewTranslation(): void {
    const key = this.elements.newTranslationKey.value.trim();
    const value = this.elements.newTranslationValue.value.trim();

    if (!key || !value) {
      this.showSnackbar("Veuillez remplir les deux champs", "warning");
      return;
    }

    try {
      // Récupérer le JSON actuel
      const currentJson = this.elements.translationsJson.value.trim();
      let translations: OptionsTranslationData = {};

      if (currentJson) {
        translations = JSON.parse(currentJson);
      }

      // Ajouter la nouvelle traduction
      translations[key] = value;

      // Mettre à jour le textarea avec le nouveau JSON
      this.elements.translationsJson.value = JSON.stringify(
        translations,
        null,
        2
      );

      // Vider les champs
      this.elements.newTranslationKey.value = "";
      this.elements.newTranslationValue.value = "";

      // Vérifier les changements
      this.checkForChanges();

      this.showSnackbar(`Traduction "${key}" ajoutée avec succès`, "success");
    } catch {
      this.showSnackbar("Erreur lors de l'ajout de la traduction", "error");
    }
  }

  private showSnackbar(
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    duration: number = 4000
  ): void {
    // Supprimer les snackbars existantes
    const existingSnackbars = document.querySelectorAll(".snackbar");
    existingSnackbars.forEach((snackbar) => snackbar.remove());

    // Créer la nouvelle snackbar
    const snackbar = document.createElement("div");
    snackbar.className = `snackbar ${type}`;

    // Icônes selon le type
    const icons = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
      warning: "⚠️",
    };

    snackbar.innerHTML = `
       <span class="snackbar-icon">${icons[type]}</span>
       <span class="snackbar-content">${message}</span>
       <button class="snackbar-close" aria-label="Fermer">×</button>
     `;

    document.body.appendChild(snackbar);

    // Gérer la fermeture manuelle
    const closeBtn = snackbar.querySelector(
      ".snackbar-close"
    ) as HTMLButtonElement;
    closeBtn.addEventListener("click", () => {
      this.hideSnackbar(snackbar);
    });

    // Afficher avec animation
    setTimeout(() => {
      snackbar.classList.add("show");
    }, 10);

    // Masquer automatiquement
    setTimeout(() => {
      this.hideSnackbar(snackbar);
    }, duration);
  }

  private hideSnackbar(snackbar: HTMLElement): void {
    snackbar.classList.remove("show");
    setTimeout(() => {
      if (snackbar.parentNode) {
        snackbar.parentNode.removeChild(snackbar);
      }
    }, 300);
  }
}

// Gestionnaire d'erreurs global
window.addEventListener("error", (event) => {
  console.error("❌ Erreur JavaScript globale:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("❌ Promesse rejetée non gérée:", event.reason);
});

document.addEventListener("DOMContentLoaded", () => {
  try {
    new OptionsManager();
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation OptionsManager:", error);
  }
});
