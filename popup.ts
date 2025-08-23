// Types globaux utilisés
interface PopupTranslationData {
  [key: string]: string | PopupTranslationData;
}

interface PopupSettings {
  translations?: PopupTranslationData;
  targetUrls?: string[];
  isEnabled?: boolean;
  delay?: number;
  translationPartsCount?: number;
}

interface PopupElements {
  statusIndicator: HTMLSpanElement;
  translationCount: HTMLSpanElement;
  urlCount: HTMLSpanElement;
  toggleExtension: HTMLButtonElement;
  toggleText: HTMLSpanElement;
  openOptions: HTMLButtonElement;
}

class PopupManager {
  private elements: PopupElements;

  constructor() {
    this.elements = {} as PopupElements;
    this.init();
  }

  private init(): void {
    this.cacheElements();
    this.bindEvents();
    this.loadStatus();
  }

  private cacheElements(): void {
    this.elements = {
      statusIndicator: document.getElementById(
        "statusIndicator"
      ) as HTMLSpanElement,
      translationCount: document.getElementById(
        "translationCount"
      ) as HTMLSpanElement,
      urlCount: document.getElementById("urlCount") as HTMLSpanElement,
      toggleExtension: document.getElementById(
        "toggleExtension"
      ) as HTMLButtonElement,
      toggleText: document.getElementById("toggleText") as HTMLSpanElement,
      openOptions: document.getElementById("openOptions") as HTMLButtonElement,
    };
  }

  private bindEvents(): void {
    try {
      this.elements.toggleExtension.addEventListener("click", () => {
        this.toggleExtension();
      });

      this.elements.openOptions.addEventListener("click", () => {
        this.openOptions();
      });
    } catch (error) {
      console.error(
        "❌ Erreur lors de la liaison des événements popup:",
        error
      );
    }
  }

  private async loadStatus(): Promise<void> {
    try {
      const result = (await chrome.storage.sync.get([
        "translations",
        "targetUrls",
        "isEnabled",
      ])) as PopupSettings;

      const translations = result.translations || {};
      const targetUrls = result.targetUrls || [];
      const isEnabled = result.isEnabled !== false;

      this.updateStatusDisplay(translations, targetUrls, isEnabled);
    } catch (error) {
      console.error("Erreur lors du chargement du statut:", error);
    }
  }

  private updateStatusDisplay(
    translations: PopupTranslationData,
    targetUrls: string[],
    isEnabled: boolean
  ): void {
    const translationCount = this.countKeys(translations);
    const urlCount =
      targetUrls.length === 0 ? "Toutes" : targetUrls.length.toString();

    this.elements.translationCount.textContent = translationCount.toString();
    this.elements.urlCount.textContent = urlCount;

    if (isEnabled) {
      this.elements.statusIndicator.textContent = "Actif";
      this.elements.statusIndicator.className = "status-indicator";
      this.elements.toggleText.textContent = "Désactiver";
      this.elements.toggleExtension.className = "btn btn-primary";
    } else {
      this.elements.statusIndicator.textContent = "Inactif";
      this.elements.statusIndicator.className = "status-indicator inactive";
      this.elements.toggleText.textContent = "Activer";
      this.elements.toggleExtension.className = "btn btn-danger";
    }
  }

  private countKeys(obj: PopupTranslationData): number {
    let count = 0;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        count++;
        if (typeof obj[key] === "object" && obj[key] !== null) {
          count += this.countKeys(obj[key] as PopupTranslationData);
        }
      }
    }
    return count;
  }

  private async toggleExtension(): Promise<void> {
    try {
      const result = (await chrome.storage.sync.get(["isEnabled"])) as {
        isEnabled?: boolean;
      };
      const currentState = result.isEnabled !== false;
      const newState = !currentState;

      await chrome.storage.sync.set({ isEnabled: newState });
      this.loadStatus();

      const message = newState ? "Extension activée" : "Extension désactivée";
      this.showNotification(message);
    } catch (error) {
      console.error("Erreur lors du changement d'état:", error);
    }
  }

  private openOptions(): void {
    try {
      // Méthode 1 : API Chrome standard
      if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        // Méthode 2 : Fallback avec getURL
        const optionsUrl = chrome.runtime.getURL("options.html");
        window.open(optionsUrl, "_blank");
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture des options:", error);
      // Méthode 3 : Fallback direct
      try {
        window.open("options.html", "_blank");
      } catch (fallbackError) {
        console.error("Erreur fallback:", fallbackError);
        // Méthode 4 : Créer un nouvel onglet manuellement
        const newTab = window.open("", "_blank");
        if (newTab) {
          newTab.location.href = "options.html";
        }
      }
    }
  }

  private showNotification(message: string): void {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #28a745;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "1";
    }, 100);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }
}

// Gestionnaire d'erreurs global
window.addEventListener("error", (event) => {
  console.error("❌ Erreur JavaScript globale (popup):", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("❌ Promesse rejetée non gérée (popup):", event.reason);
});

document.addEventListener("DOMContentLoaded", () => {
  try {
    new PopupManager();
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation PopupManager:", error);
  }
});
