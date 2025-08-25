// Types pour le composant de traduction
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

// Types pour le composant d'autocomplétion
interface AutocompleteElements {
  searchInput: HTMLInputElement;
  suggestionsList: HTMLDivElement;
  container: HTMLElement;
}

interface AutocompleteCallbacks {
  onSelect?: (key: string, value: string) => void;
  onEdit?: (key: string, value: string) => void;
  onDelete?: (key: string) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

class TranslationForm {
  private elements!: TranslationFormElements;
  private readonly callbacks: TranslationFormCallbacks;

  private sanitizeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private setElementHtml(element: HTMLElement, html: string): void {
    element.innerHTML = html;
  }

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

    // Créer la structure HTML
    this.setElementHtml(
      container,
      `
      <div class="translation-add-form">
        <div class="form-row">
          <div class="form-group">
            <label for="translationKey_${this.sanitizeHtml(
              containerId
            )}">Clé :</label>
            <input type="text" id="translationKey_${this.sanitizeHtml(
              containerId
            )}" placeholder="Texte à traduire" class="form-input">
          </div>
          <div class="form-group">
            <label for="translationValue_${this.sanitizeHtml(
              containerId
            )}">Traduction :</label>
            <input type="text" id="translationValue_${this.sanitizeHtml(
              containerId
            )}" placeholder="Traduction" class="form-input">
          </div>
          <div class="form-group">
            <button id="translationAdd_${this.sanitizeHtml(
              containerId
            )}" class="btn btn-primary">➕ Ajouter</button>
          </div>
        </div>
      </div>
    `
    );

    // Cache les éléments
    this.elements = {
      keyInput: document.getElementById(
        `translationKey_${this.sanitizeHtml(containerId)}`
      ) as HTMLInputElement,
      valueInput: document.getElementById(
        `translationValue_${this.sanitizeHtml(containerId)}`
      ) as HTMLInputElement,
      addButton: document.getElementById(
        `translationAdd_${this.sanitizeHtml(containerId)}`
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

    // Permettre l'ajout avec Entrée
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
      // Appeler le callback personnalisé si fourni
      if (this.callbacks.onAdd) {
        await this.callbacks.onAdd(key, value);
      } else {
        // Comportement par défaut : ajouter au storage
        await this.addToStorage(key, value);
      }

      // Vider les champs
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
    // Récupérer les traductions actuelles
    const result = await chrome.storage.sync.get([
      "translations",
      "translationPartsCount",
    ]);

    let translations: Record<string, string> = {};
    const translationPartsCount = result["translationPartsCount"] || 0;

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

// Classe d'autocomplétion pour les traductions
class TranslationAutocomplete {
  private elements!: AutocompleteElements;
  private readonly callbacks: AutocompleteCallbacks;
  private allTranslations: Record<string, string> = {};
  private filteredSuggestions: Array<{ key: string; value: string }> = [];

  private sanitizeHtmlForAutocomplete(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private setElementHtml(element: HTMLElement, html: string): void {
    element.innerHTML = html;
  }

  constructor(containerId: string, callbacks: AutocompleteCallbacks = {}) {
    this.callbacks = callbacks;
    this.createAutocomplete(containerId);
    this.bindEvents();
    this.loadTranslations();
  }

  private createAutocomplete(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container avec l'ID "${containerId}" non trouvé`);
    }

    // Créer la structure HTML
    this.setElementHtml(
      container,
      `
      <div class="translation-autocomplete">
        <div class="autocomplete-search">
          <input type="text" id="autocompleteSearch_${this.sanitizeHtmlForAutocomplete(
            containerId
          )}" placeholder="Rechercher une traduction..." class="form-input">
          <div id="autocompleteSuggestions_${this.sanitizeHtmlForAutocomplete(
            containerId
          )}" class="autocomplete-suggestions"></div>
        </div>
      </div>
    `
    );

    // Cache les éléments
    this.elements = {
      searchInput: document.getElementById(
        `autocompleteSearch_${this.sanitizeHtmlForAutocomplete(containerId)}`
      ) as HTMLInputElement,
      suggestionsList: document.getElementById(
        `autocompleteSuggestions_${this.sanitizeHtmlForAutocomplete(
          containerId
        )}`
      ) as HTMLDivElement,
      container: container,
    };
  }

  private bindEvents(): void {
    this.elements.searchInput.addEventListener("input", () => {
      this.handleSearch();
    });

    this.elements.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideSuggestions();
      }
    });

    // Fermer les suggestions en cliquant ailleurs
    document.addEventListener("click", (e) => {
      if (!this.elements.container.contains(e.target as HTMLElement)) {
        this.hideSuggestions();
      }
    });
  }

  private async loadTranslations(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get([
        "translations",
        "translationPartsCount",
      ]);

      let translations: Record<string, string> = {};
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

      this.allTranslations = translations;
    } catch (error) {
      console.error("Erreur lors du chargement des traductions:", error);
    }
  }

  private handleSearch(): void {
    const searchTerm = this.elements.searchInput.value.trim().toLowerCase();

    if (searchTerm.length < 2) {
      this.hideSuggestions();
      return;
    }

    this.filteredSuggestions = Object.entries(this.allTranslations)
      .filter(
        ([key, value]) =>
          key.toLowerCase().includes(searchTerm) ||
          value.toLowerCase().includes(searchTerm)
      )
      .map(([key, value]) => ({ key, value }))
      .slice(0, 10); // Limiter à 10 résultats

    this.showSuggestions();
  }

  private showSuggestions(): void {
    if (this.filteredSuggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.setElementHtml(
      this.elements.suggestionsList,
      this.filteredSuggestions
        .map(
          ({ key, value }) => `
        <div class="suggestion-item" data-key="${this.sanitizeHtmlForAutocomplete(
          key
        )}" data-value="${this.sanitizeHtmlForAutocomplete(value)}">
          <div class="suggestion-content">
            <div class="suggestion-key">${this.highlightMatch(
              key,
              this.elements.searchInput.value
            )}</div>
            <div class="suggestion-value">${this.highlightMatch(
              value,
              this.elements.searchInput.value
            )}</div>
          </div>
          <div class="suggestion-actions">
            <button class="btn btn-secondary suggestion-edit" title="Modifier">✏️</button>
            <button class="btn btn-danger suggestion-delete" title="Supprimer">🗑️</button>
          </div>
        </div>
      `
        )
        .join("")
    );

    this.elements.suggestionsList.style.display = "block";

    // Ajouter les événements aux boutons
    this.elements.suggestionsList
      .querySelectorAll(".suggestion-edit")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const item = (btn as HTMLElement).closest(
            ".suggestion-item"
          ) as HTMLElement;
          const key = item.dataset["key"] || "";
          const value = item.dataset["value"] || "";
          this.handleEdit(key, value);
        });
      });

    this.elements.suggestionsList
      .querySelectorAll(".suggestion-delete")
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const item = (btn as HTMLElement).closest(
            ".suggestion-item"
          ) as HTMLElement;
          const key = item.dataset["key"] || "";
          this.handleDelete(key);
        });
      });
  }

  private highlightMatch(text: string, searchTerm: string): string {
    if (!searchTerm) return text;
    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(regex, "<mark>$1</mark>");
  }

  private hideSuggestions(): void {
    this.elements.suggestionsList.style.display = "none";
  }

  private handleEdit(key: string, value: string): void {
    this.hideSuggestions();
    this.elements.searchInput.value = "";

    if (this.callbacks.onEdit) {
      this.callbacks.onEdit(key, value);
    }
  }

  private async handleDelete(key: string): Promise<void> {
    if (
      !confirm(`Êtes-vous sûr de vouloir supprimer la traduction "${key}" ?`)
    ) {
      return;
    }

    try {
      // Utiliser le callback de suppression fourni par le parent
      if (this.callbacks.onDelete) {
        await this.callbacks.onDelete(key);
      } else {
        // Fallback : logique de suppression locale
        delete this.allTranslations[key];
        await this.updateStorage();
      }

      this.hideSuggestions();
      this.elements.searchInput.value = "";

      // Le message de succès sera géré par le callback parent
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      const message = "Erreur lors de la suppression de la traduction";
      this.callbacks.onError?.(message);
    }
  }

  private async updateStorage(): Promise<void> {
    const result = await chrome.storage.sync.get(["translationPartsCount"]);
    const translationPartsCount = result["translationPartsCount"] || 0;

    if (translationPartsCount > 0) {
      // Diviser en parties si nécessaire
      const entries = Object.entries(this.allTranslations);
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
      await chrome.storage.sync.set({ translations: this.allTranslations });
    }
  }

  // Méthodes publiques
  public refresh(): void {
    this.loadTranslations();
  }

  public updateFromJson(jsonText: string): void {
    try {
      if (jsonText.trim()) {
        this.allTranslations = JSON.parse(jsonText);
      } else {
        this.allTranslations = {};
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour depuis le JSON:", error);
    }
  }

  public focus(): void {
    this.elements.searchInput.focus();
  }
}

// Exporter pour utilisation globale
(window as unknown as Record<string, unknown>)["TranslationForm"] =
  TranslationForm;
(window as unknown as Record<string, unknown>)["TranslationAutocomplete"] =
  TranslationAutocomplete;

// S'assurer que l'export est disponible immédiatement
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>)["TranslationForm"] =
    TranslationForm;
  (window as unknown as Record<string, unknown>)["TranslationAutocomplete"] =
    TranslationAutocomplete;
}
