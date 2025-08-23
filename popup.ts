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
  siteStatusIndicator: HTMLSpanElement;
  openOptions: HTMLButtonElement;
  addCurrentSite: HTMLButtonElement;
  removeCurrentSite: HTMLButtonElement;
  currentSiteUrl: HTMLInputElement;
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
      siteStatusIndicator: document.getElementById(
        "siteStatusIndicator"
      ) as HTMLSpanElement,
      openOptions: document.getElementById("openOptions") as HTMLButtonElement,
      addCurrentSite: document.getElementById(
        "addCurrentSite"
      ) as HTMLButtonElement,
      removeCurrentSite: document.getElementById(
        "removeCurrentSite"
      ) as HTMLButtonElement,
      currentSiteUrl: document.getElementById(
        "currentSiteUrl"
      ) as HTMLInputElement,
    };
  }

  private bindEvents(): void {
    try {
      this.elements.openOptions.addEventListener("click", () => {
        this.openOptions();
      });

      this.elements.addCurrentSite.addEventListener("click", () => {
        this.addCurrentSite();
      });

      this.elements.removeCurrentSite.addEventListener("click", () => {
        this.removeCurrentSite();
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

      const targetUrls = result.targetUrls || [];
      const isEnabled = result.isEnabled !== false;

      await this.updateStatusDisplay(targetUrls, isEnabled);
    } catch (error) {
      console.error("Erreur lors du chargement du statut:", error);
    }
  }

  private async updateStatusDisplay(
    targetUrls: string[],
    isEnabled: boolean
  ): Promise<void> {
    try {
      // Récupérer l'URL de l'onglet actif
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];

      let currentDomain = "";
      if (activeTab?.url) {
        currentDomain = new URL(activeTab.url).hostname;
      }

      const isActiveOnCurrentSite = this.isExtensionActiveOnSite(
        currentDomain,
        targetUrls,
        isEnabled
      );

      // Afficher le domaine qui sera ajouté
      this.elements.currentSiteUrl.value = currentDomain;

      // Afficher le statut spécifique au site actuel
      if (isActiveOnCurrentSite) {
        this.elements.siteStatusIndicator.textContent = "Actif";
        this.elements.siteStatusIndicator.className = "status-indicator";
        this.elements.addCurrentSite.classList.remove("visible");
        this.elements.removeCurrentSite.classList.add("visible");
      } else {
        this.elements.siteStatusIndicator.textContent = "Inactif";
        this.elements.siteStatusIndicator.className =
          "status-indicator inactive";
        this.elements.addCurrentSite.classList.add("visible");
        this.elements.removeCurrentSite.classList.remove("visible");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'affichage:", error);
    }
  }

  private isExtensionActiveOnSite(
    currentDomain: string,
    targetUrls: string[],
    isEnabled: boolean
  ): boolean {
    if (!isEnabled) return false;
    if (targetUrls.length === 0) return true; // Actif sur tous les sites

    return targetUrls.some((url) => {
      if (url.startsWith("*://")) {
        const pattern = url.replace("*://", "");
        return currentDomain.includes(pattern);
      }
      return currentDomain === url || currentDomain.includes(url);
    });
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

  private async addCurrentSite(): Promise<void> {
    try {
      // Utiliser le domaine du champ de texte
      const domain = this.elements.currentSiteUrl.value.trim();

      if (!domain) {
        this.showNotification("Veuillez saisir un domaine valide");
        return;
      }

      // Récupérer les URLs actuelles
      const result = (await chrome.storage.sync.get(["targetUrls"])) as {
        targetUrls?: string[];
      };
      const currentUrls = result.targetUrls || [];

      // Ajouter le domaine actuel s'il n'est pas déjà présent
      if (!currentUrls.includes(domain)) {
        const newUrls = [...currentUrls, domain];
        await chrome.storage.sync.set({ targetUrls: newUrls });

        this.showNotification(`Site ${domain} ajouté aux URLs ciblées`);
        this.loadStatus(); // Recharger l'affichage

        // Recharger l'onglet actuel pour que l'extension prenne en compte le nouveau site
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];
        if (activeTab?.id) {
          await chrome.tabs.reload(activeTab.id);
        }
      } else {
        this.showNotification(`Le site ${domain} est déjà dans la liste`);
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du site:", error);
      this.showNotification("Erreur lors de l'ajout du site");
    }
  }

  private async removeCurrentSite(): Promise<void> {
    try {
      // Utiliser le domaine du champ de texte
      const domain = this.elements.currentSiteUrl.value.trim();

      if (!domain) {
        this.showNotification("Veuillez saisir un domaine valide");
        return;
      }

      // Récupérer les URLs actuelles
      const result = (await chrome.storage.sync.get(["targetUrls"])) as {
        targetUrls?: string[];
      };
      const currentUrls = result.targetUrls || [];

      // Retirer le domaine actuel s'il est présent
      if (currentUrls.includes(domain)) {
        const newUrls = currentUrls.filter((url) => url !== domain);
        await chrome.storage.sync.set({ targetUrls: newUrls });

        this.showNotification(`Site ${domain} retiré des URLs ciblées`);
        this.loadStatus(); // Recharger l'affichage

        // Recharger l'onglet actuel pour que l'extension prenne en compte le changement
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const activeTab = tabs[0];
        if (activeTab?.id) {
          await chrome.tabs.reload(activeTab.id);
        }
      } else {
        this.showNotification(`Le site ${domain} n'est pas dans la liste`);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du site:", error);
      this.showNotification("Erreur lors de la suppression du site");
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
