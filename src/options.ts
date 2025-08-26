import { TranslationAutocomplete } from "./components/TranslationAutocomplete";
import { TranslationForm } from "./components/TranslationForm";
import type { ExportData, Settings, TranslationData } from "./types";
import { DomUtils } from "./utils/dom";
import { StorageManager } from "./utils/storage";

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
  addNewUrl: HTMLButtonElement;
}

class OptionsManager {
  private elements: OptionsElements;
  private originalSettings: Settings = {};
  private hasChanges = false;
  private translationForm?: TranslationForm;
  private translationAutocomplete?: TranslationAutocomplete;

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
    this.elements = {
      translationsJson: document.getElementById(
        "translationsJson"
      ) as HTMLTextAreaElement,
      urlList: document.getElementById("urlList") as HTMLDivElement,
      isEnabled: document.getElementById("isEnabled") as HTMLInputElement,
      delayInput: document.getElementById("delayInput") as HTMLInputElement,
      formatAndValidateJson: document.getElementById(
        "formatAndValidateJson"
      ) as HTMLButtonElement,
      saveOptionsSettings: document.getElementById(
        "saveOptionsSettings"
      ) as HTMLButtonElement,
      resetOptionsSettings: document.getElementById(
        "resetOptionsSettings"
      ) as HTMLButtonElement,
      exportOptionsSettings: document.getElementById(
        "exportOptionsSettings"
      ) as HTMLButtonElement,
      importOptionsSettings: document.getElementById(
        "importOptionsSettings"
      ) as HTMLButtonElement,
      importFile: document.getElementById("importFile") as HTMLInputElement,
      addNewUrl: document.getElementById("addNewUrl") as HTMLButtonElement,
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

      this.initTranslationForm();
      this.initTranslationAutocomplete();

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
        } else if (
          target.classList.contains("add-url") &&
          !(target as HTMLButtonElement).disabled
        ) {
          this.addUrlField("", true);
        }
      });

      this.elements.urlList.addEventListener("input", () => {
        this.checkForChanges();
      });

      this.elements.addNewUrl.addEventListener("click", () => {
        this.addUrlField("", true);
      });
    } catch (error) {
      console.error("❌ Erreur lors de la liaison des événements:", error);
    }
  }

  private async loadOptionsSettings(): Promise<void> {
    try {
      const settings = await StorageManager.loadSettings();

      this.elements.translationsJson.value = JSON.stringify(
        settings.translations || {},
        null,
        2
      );
      this.populateUrlList(settings.targetUrls || []);
      this.elements.isEnabled.checked = settings.isEnabled !== false;
      this.elements.delayInput.value = (settings.delay || 300).toString();

      this.originalSettings = {
        translations: settings.translations || {},
        targetUrls: settings.targetUrls || [],
        isEnabled: settings.isEnabled !== false,
        delay: settings.delay || 300,
      };

      this.checkForChanges();

      if (this.translationAutocomplete?.updateFromJson) {
        this.translationAutocomplete.updateFromJson(
          this.elements.translationsJson.value
        );
      }
    } catch {
      this.showSnackbar("Erreur lors du chargement des paramètres", "error");
    }
  }

  private populateUrlList(urls: string[]): void {
    DomUtils.setElementContent(this.elements.urlList, "");

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

  private getCurrentSettings(): Settings {
    const urlInputs = this.elements.urlList.querySelectorAll(".url-input");
    const targetUrls = Array.from(urlInputs)
      .map((input) => (input as HTMLInputElement).value.trim())
      .filter((url) => url.length > 0);

    let translations: Record<string, unknown> = {};
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

  private hasSettingsChanged(currentSettings: Settings): boolean {
    const originalTranslations = JSON.stringify(
      this.originalSettings.translations || {}
    );
    const currentTranslations = JSON.stringify(
      currentSettings.translations || {}
    );
    if (originalTranslations !== currentTranslations) return true;

    const originalUrls = JSON.stringify(this.originalSettings.targetUrls || []);
    const currentUrls = JSON.stringify(currentSettings.targetUrls || []);
    if (originalUrls !== currentUrls) return true;

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

    DomUtils.setElementHtml(
      urlItem,
      `
      <input type="text" placeholder="exemple.com" class="url-input" value="${DomUtils.sanitizeHtml(
        value
      )}">
      <div class="url-buttons">
        <button class="btn btn-danger remove-url" title="Supprimer cette URL">🗑️</button>
      </div>
    `
    );
    this.elements.urlList.appendChild(urlItem);

    const urlInput = urlItem.querySelector(".url-input") as HTMLInputElement;
    const addButton = urlItem.querySelector(".add-url") as HTMLButtonElement;

    urlInput.addEventListener("input", () => {
      this.updateUrlButtonState(urlInput, addButton);
    });

    if (checkChanges) {
      this.checkForChanges();
    }
  }

  private updateUrlButtonState(
    urlInput: HTMLInputElement,
    addButton: HTMLButtonElement
  ): void {
    const hasValue = urlInput.value.trim().length > 0;

    if (hasValue) {
      addButton.disabled = true;
      addButton.classList.add("disabled");
    } else {
      addButton.disabled = false;
      addButton.classList.remove("disabled");
    }
  }

  private removeUrlField(button: HTMLElement): void {
    const urlItem = button.closest(".url-item") as HTMLElement;
    if (this.elements.urlList.children.length > 1) {
      urlItem.remove();

      const remainingUrls =
        this.elements.urlList.querySelectorAll(".url-input");
      const hasEmptyUrl = Array.from(remainingUrls).some(
        (input) => (input as HTMLInputElement).value.trim().length === 0
      );

      if (!hasEmptyUrl) {
        this.addUrlField("", false);
      }

      this.checkForChanges();
    }
  }

  private countKeys(obj: Record<string, unknown>): number {
    let count = 0;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        count++;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          count += this.countKeys(obj[key] as Record<string, unknown>);
        }
      }
    }
    return count;
  }

  private formatJsonInTextarea(): void {
    try {
      const jsonText = this.elements.translationsJson.value.trim();
      if (!jsonText) return;

      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      const formatted = JSON.stringify(parsed, null, 2);
      this.elements.translationsJson.value = formatted;
    } catch {
      // En cas d'erreur de parsing, on ne fait rien
    }
  }

  private formatAndValidateJson(): void {
    try {
      const jsonText = this.elements.translationsJson.value.trim();
      if (!jsonText) {
        this.showSnackbar("Le JSON est vide", "info");
        return;
      }

      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      const formatted = JSON.stringify(parsed, null, 2);
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
      let translations: Record<string, unknown> = {};

      if (translationsText) {
        translations = JSON.parse(translationsText);
      }

      const urlInputs = this.elements.urlList.querySelectorAll(".url-input");
      const targetUrls = Array.from(urlInputs)
        .map((input) => (input as HTMLInputElement).value.trim())
        .filter((url) => url.length > 0);

      const settings: Settings = {
        translations: translations as TranslationData,
        targetUrls,
        isEnabled: this.elements.isEnabled.checked,
        delay: parseInt(this.elements.delayInput.value) || 300,
      };

      await StorageManager.saveSettings(settings);
      this.showSnackbar("Paramètres sauvegardés avec succès !", "success");

      this.originalSettings = this.getCurrentSettings();
      this.hasChanges = false;
      this.updateButtonsState();
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
      const settings = await StorageManager.loadSettings();

      const exportData: ExportData = {
        version: chrome.runtime.getManifest().version,
        exportDate: new Date().toISOString(),
        translations: settings.translations || ({} as TranslationData),
        targetUrls: settings.targetUrls || [],
        isEnabled: settings.isEnabled !== false,
        delay: settings.delay || 300,
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

      if (this.translationAutocomplete?.updateFromJson) {
        this.translationAutocomplete.updateFromJson(
          this.elements.translationsJson.value
        );
      }

      await this.saveOptionsSettings();
      this.showSnackbar("Paramètres importés avec succès", "success");
      target.value = "";

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

  private initTranslationForm(): void {
    try {
      this.translationForm = new TranslationForm("translationFormContainer", {
        onAdd: async (key: string, value: string): Promise<void> => {
          await this.handleTranslationAdd(key, value);
        },
        onSuccess: (message: string): void => {
          this.showSnackbar(message, "success");
        },
        onError: (message: string): void => {
          this.showSnackbar(message, "error");
        },
      });
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation du formulaire de traduction:",
        error
      );
    }
  }

  private initTranslationAutocomplete(): void {
    try {
      this.translationAutocomplete = new TranslationAutocomplete(
        "translationAutocompleteContainer",
        {
          onEdit: (key: string, value: string): void => {
            this.handleTranslationEdit(key, value);
          },
          onDelete: async (key: string): Promise<void> => {
            await this.handleTranslationDelete(key);
          },
          onSuccess: (message: string): void => {
            this.showSnackbar(message, "success");
          },
          onError: (message: string): void => {
            this.showSnackbar(message, "error");
          },
        }
      );
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation de l'autocomplétion:",
        error
      );
    }
  }

  private async handleTranslationAdd(
    key: string,
    value: string
  ): Promise<void> {
    try {
      const currentJson = this.elements.translationsJson.value.trim();
      let translations: Record<string, unknown> = {};

      if (currentJson) {
        translations = JSON.parse(currentJson);
      }

      translations[key] = value;
      this.elements.translationsJson.value = JSON.stringify(
        translations,
        null,
        2
      );
      this.checkForChanges();
      await this.saveOptionsSettings();

      if (this.translationAutocomplete?.updateFromJson) {
        this.translationAutocomplete.updateFromJson(
          this.elements.translationsJson.value
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de la traduction:", error);
      this.showSnackbar("Erreur lors de l'ajout de la traduction", "error");
    }
  }

  private handleTranslationEdit(key: string, value: string): void {
    try {
      if (this.translationForm) {
        this.translationForm.setKey(key);
        this.translationForm.setValue(value);
        this.translationForm.focus();
      }

      this.showSnackbar(
        `Modification de "${key}" - remplissez le formulaire ci-dessus`,
        "info"
      );
    } catch (error) {
      console.error("Erreur lors de la modification de la traduction:", error);
      this.showSnackbar(
        "Erreur lors de la modification de la traduction",
        "error"
      );
    }
  }

  private async handleTranslationDelete(key: string): Promise<void> {
    try {
      const currentJson = this.elements.translationsJson.value.trim();
      let translations: Record<string, unknown> = {};

      if (currentJson) {
        translations = JSON.parse(currentJson);
      }

      delete translations[key];
      this.elements.translationsJson.value = JSON.stringify(
        translations,
        null,
        2
      );
      this.checkForChanges();
      await this.saveOptionsSettings();

      if (this.translationAutocomplete?.updateFromJson) {
        this.translationAutocomplete.updateFromJson(
          this.elements.translationsJson.value
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la traduction:", error);
      this.showSnackbar(
        "Erreur lors de la suppression de la traduction",
        "error"
      );
    }
  }

  private showSnackbar(
    message: string,
    type: "success" | "error" | "info" | "warning" = "info",
    duration: number = 4000
  ): void {
    const existingSnackbars = document.querySelectorAll(".snackbar");
    existingSnackbars.forEach((snackbar) => snackbar.remove());

    const snackbar = document.createElement("div");
    snackbar.className = `snackbar ${type}`;

    const icons = {
      success: "✅",
      error: "❌",
      info: "ℹ️",
      warning: "⚠️",
    };

    DomUtils.setElementHtml(
      snackbar,
      `
       <span class="snackbar-icon">${icons[type]}</span>
       <span class="snackbar-content">${DomUtils.sanitizeHtml(message)}</span>
       <button class="snackbar-close" aria-label="Fermer">×</button>
     `
    );

    document.body.appendChild(snackbar);

    const closeBtn = snackbar.querySelector(
      ".snackbar-close"
    ) as HTMLButtonElement;
    closeBtn.addEventListener("click", () => {
      this.hideSnackbar(snackbar);
    });

    setTimeout(() => {
      snackbar.classList.add("show");
    }, 10);

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
