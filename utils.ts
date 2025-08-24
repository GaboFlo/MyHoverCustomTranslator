/// <reference lib="dom" />

/**
 * Utilitaires pour sécuriser l'utilisation d'innerHTML
 */

/**
 * Échappe les caractères spéciaux HTML pour éviter les attaques XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Crée un élément HTML de manière sécurisée
 */
export function createElement(
  tagName: string,
  attributes: Record<string, string> = {},
  textContent?: string
): HTMLElement {
  const element = document.createElement(tagName);

  // Ajouter les attributs
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  // Ajouter le contenu texte si fourni
  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

/**
 * Remplace le contenu d'un élément de manière sécurisée
 */
export function replaceElementContent(
  element: HTMLElement,
  content: string
): void {
  element.textContent = content;
}

/**
 * Met à jour le contenu d'un élément en préservant les balises HTML sécurisées
 * Utilise une approche basée sur la création d'éléments DOM plutôt que innerHTML
 */
export function updateElementContent(
  element: HTMLElement,
  content: string
): void {
  // Pour les cas où on veut préserver certaines balises HTML (comme <span> pour le surlignage)
  // on utilise une approche basée sur la création d'éléments DOM

  // Vérifier si le contenu contient des balises HTML
  if (content.includes("<") && content.includes(">")) {
    // Créer un élément temporaire pour parser le HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // Vérifier que le contenu ne contient que des balises autorisées
    const allowedTags = ["span", "mark", "strong", "em", "b", "i"];
    const hasOnlyAllowedTags = Array.from(tempDiv.children).every((child) =>
      allowedTags.includes(child.tagName.toLowerCase())
    );

    if (hasOnlyAllowedTags) {
      // Vider l'élément et ajouter le contenu parsé
      element.textContent = "";
      while (tempDiv.firstChild) {
        element.appendChild(tempDiv.firstChild);
      }
    } else {
      // Si des balises non autorisées sont détectées, échapper tout
      element.textContent = content;
    }
  } else {
    // Pas de balises HTML, utiliser textContent directement
    element.textContent = content;
  }
}

/**
 * Crée un élément avec du contenu HTML sécurisé
 */
export function createElementWithHTML(
  tagName: string,
  htmlContent: string
): HTMLElement {
  const element = document.createElement(tagName);

  // Vérifier que le contenu ne contient que des balises autorisées
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  const allowedTags = ["span", "mark", "strong", "em", "b", "i"];
  const hasOnlyAllowedTags = Array.from(tempDiv.children).every((child) =>
    allowedTags.includes(child.tagName.toLowerCase())
  );

  if (hasOnlyAllowedTags) {
    element.innerHTML = htmlContent;
  } else {
    element.textContent = htmlContent;
  }

  return element;
}
