import type { TranslationData } from "../types";
import { DomUtils } from "../utils/dom";

interface TranslationFormElements {
  keyInput: HTMLInputElement;
  valueInput: HTMLInputElement;
  addButton: HTMLButtonElement;
  container: HTMLElement;
}

interface TranslationFormCallbacks {
  onAdd?: (key: string, value: string) => void | Promise<void>;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export class TranslationForm {
  private elements!: TranslationFormElements;
  private readonly callbacks: TranslationFormCallbacks;

  constructor(containerId: string, callbacks: TranslationFormCallbacks = {}) {
    this.callbacks = callbacks;
    this.createForm(containerId);
    this.bindEvents();
  }

  private createForm(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container avec l'ID "${containerId}" non trouvé`);
    }

    DomUtils.setElementHtml(
      container,
      `
      <div class="translation-add-form">
        <div class="form-row">
          <div class="form-group">
            <label for="translationKey_${DomUtils.sanitizeHtml(
              containerId
            )}">Clé :</label>
            <input type="text" id="translationKey_${DomUtils.sanitizeHtml(
              containerId
            )}" placeholder="Texte à traduire" class="form-input">
          </div>
          <div class="form-group">
            <label for="translationValue_${DomUtils.sanitizeHtml(
              containerId
            )}">Traduction :</label>
            <input type="text" id="translationValue_${DomUtils.sanitizeHtml(
              containerId
            )}" placeholder="Traduction" class="form-input">
          </div>
          <div class="form-group">
            <button id="translationAdd_${DomUtils.sanitizeHtml(
              containerId
            )}" class="btn btn-primary">➕ Ajouter</button>
          </div>
        </div>
      </div>
    `
    );

    this.elements = {
      keyInput: document.getElementById(
        `translationKey_${DomUtils.sanitizeHtml(containerId)}`
      ) as HTMLInputElement,
      valueInput: document.getElementById(
        `translationValue_${DomUtils.sanitizeHtml(containerId)}`
      ) as HTMLInputElement,
      addButton: document.getElementById(
        `translationAdd_${DomUtils.sanitizeHtml(containerId)}`
      ) as HTMLButtonElement,
      container: container,
    };
  }

  private bindEvents(): void {
    this.elements.addButton.addEventListener("click", () => {
      this.addTranslation().catch((error) => {
        console.error("Erreur lors de l'ajout de traduction:", error);
      });
    });

    this.elements.keyInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.elements.valueInput.focus();
      }
    });

    this.elements.valueInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.addTranslation().catch((error) => {
          console.error("Erreur lors de l'ajout de traduction:", error);
        });
      }
    });
  }

  private async addTranslation(): Promise<void> {
    const key = this.elements.keyInput.value.trim();
    const value = this.elements.valueInput.value.trim();

    if (!key || !value) {
      const message = "Veuillez remplir les deux champs";
      this.callbacks.onError?.(message);
      return;
    }

    try {
      if (this.callbacks.onAdd) {
        await this.callbacks.onAdd(key, value);
      } else {
        await this.addToStorage(key, value);
      }

      this.elements.keyInput.value = "";
      this.elements.valueInput.value = "";
      this.elements.keyInput.focus();

      const message = `Traduction "${key}" ajoutée avec succès, rechargez la page pour voir les changements`;
      this.callbacks.onSuccess?.(message);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la traduction:", error);
      const message = "Erreur lors de l'ajout de la traduction";
      this.callbacks.onError?.(message);
    }
  }

  private async addToStorage(key: string, value: string): Promise<void> {
    const result = await chrome.storage.sync.get([
      "translations",
      "translationPartsCount",
    ]);

    let translations: TranslationData = {};
    const translationPartsCount = result["translationPartsCount"] || 0;

    if (translationPartsCount > 0) {
      const partKeys = Array.from(
        { length: translationPartsCount },
        (_, i) => `translationPart_${i}`
      );
      const parts = await chrome.storage.sync.get(partKeys);

      for (let i = 0; i < translationPartsCount; i++) {
        const partKey = `translationPart_${i}`;
        if (parts[partKey]) {
          translations = { ...translations, ...parts[partKey] };
        }
      }
    } else {
      translations = result["translations"] || {};
    }

    translations[key] = value;

    if (translationPartsCount > 0) {
      const entries = Object.entries(translations);
      const chunkSize = 1000;
      const newPartsCount = Math.ceil(entries.length / chunkSize);

      for (let i = 0; i < newPartsCount; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const part = Object.fromEntries(entries.slice(start, end));
        await chrome.storage.sync.set({ [`translationPart_${i}`]: part });
      }

      await chrome.storage.sync.set({ translationPartsCount: newPartsCount });
    } else {
      await chrome.storage.sync.set({ translations });
    }
  }

  public focus(): void {
    this.elements.keyInput.focus();
  }

  public clear(): void {
    this.elements.keyInput.value = "";
    this.elements.valueInput.value = "";
  }

  public setKey(key: string): void {
    this.elements.keyInput.value = key;
  }

  public setValue(value: string): void {
    this.elements.valueInput.value = value;
  }
}
