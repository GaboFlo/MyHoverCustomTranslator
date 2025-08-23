// Types pour le composant de traduction
interface TranslationFormElements {
  keyInput: HTMLInputElement;
  valueInput: HTMLInputElement;
  addButton: HTMLButtonElement;
  container: HTMLElement;
}

interface TranslationFormCallbacks {
  onAdd?: (key: string, value: string) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

class TranslationForm {
  private elements!: TranslationFormElements;
  private callbacks: TranslationFormCallbacks;

  constructor(
    containerId: string,
    callbacks: TranslationFormCallbacks = {}
  ) {
    this.callbacks = callbacks;
    this.createForm(containerId);
    this.bindEvents();
  }

  private createForm(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container avec l'ID "${containerId}" non trouvé`);
    }

    // Créer la structure HTML
    container.innerHTML = `
      <div class="translation-add-form">
        <div class="form-row">
          <div class="form-group">
            <label for="translationKey_${containerId}">Clé :</label>
            <input type="text" id="translationKey_${containerId}" placeholder="Texte à traduire" class="form-input">
          </div>
          <div class="form-group">
            <label for="translationValue_${containerId}">Traduction :</label>
            <input type="text" id="translationValue_${containerId}" placeholder="Traduction" class="form-input">
          </div>
          <div class="form-group">
            <button id="translationAdd_${containerId}" class="btn btn-primary">➕ Ajouter</button>
          </div>
        </div>
      </div>
    `;

    // Cache les éléments
    this.elements = {
      keyInput: document.getElementById(`translationKey_${containerId}`) as HTMLInputElement,
      valueInput: document.getElementById(`translationValue_${containerId}`) as HTMLInputElement,
      addButton: document.getElementById(`translationAdd_${containerId}`) as HTMLButtonElement,
      container: container
    };
  }

  private bindEvents(): void {
    this.elements.addButton.addEventListener("click", () => {
      this.addTranslation();
    });

    // Permettre l'ajout avec Entrée
    this.elements.keyInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.elements.valueInput.focus();
      }
    });

    this.elements.valueInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.addTranslation();
      }
    });
  }

  private addTranslation(): void {
    const key = this.elements.keyInput.value.trim();
    const value = this.elements.valueInput.value.trim();

    if (!key || !value) {
      const message = "Veuillez remplir les deux champs";
      this.callbacks.onError?.(message);
      return;
    }

    try {
      // Appeler le callback personnalisé si fourni
      if (this.callbacks.onAdd) {
        this.callbacks.onAdd(key, value);
      } else {
        // Comportement par défaut : ajouter au storage
        this.addToStorage(key, value);
      }

      // Vider les champs
      this.elements.keyInput.value = "";
      this.elements.valueInput.value = "";
      this.elements.keyInput.focus();

      const message = `Traduction "${key}" ajoutée avec succès`;
      this.callbacks.onSuccess?.(message);
    } catch (error) {
      const message = "Erreur lors de l'ajout de la traduction";
      this.callbacks.onError?.(message);
    }
  }

  private async addToStorage(key: string, value: string): Promise<void> {
    // Récupérer les traductions actuelles
    const result = await chrome.storage.sync.get([
      "translations",
      "translationPartsCount"
    ]);

    let translations: Record<string, string> = {};
    let translationPartsCount = result["translationPartsCount"] || 0;

    // Charger les traductions existantes
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

    // Ajouter la nouvelle traduction
    translations[key] = value;

    // Sauvegarder
    if (translationPartsCount > 0) {
      // Diviser en parties si nécessaire
      const entries = Object.entries(translations);
      const chunkSize = 1000; // Taille maximale par partie
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

  // Méthodes publiques
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

// Exporter pour utilisation globale
(window as any).TranslationForm = TranslationForm;
