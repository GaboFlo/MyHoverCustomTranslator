export class DomUtils {
  static sanitizeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  static setElementContent(element: HTMLElement, content: string): void {
    element.textContent = content;
  }

  static setElementHtml(element: HTMLElement, html: string): void {
    element.innerHTML = html;
  }

  static escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  static getTextFromElement(element: Element): string | null {
    if (element.hasAttribute("data-auto-highlight")) {
      return null;
    }

    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent?.trim() || null;
    }

    if (element.nodeType === Node.ELEMENT_NODE) {
      const text = element.textContent?.trim();
      if (text && element.children.length === 0) {
        return text;
      }
    }

    return null;
  }

  static createNotification(options: {
    message: string;
    type?: "success" | "error" | "info" | "warning";
    duration?: number;
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  }): void {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = options.message;

    const backgroundColor =
      options.type === "success"
        ? "#28a745"
        : options.type === "error"
        ? "#fd7e14"
        : options.type === "warning"
        ? "#ffc107"
        : "#17a2b8";

    const position = options.position || "top-right";
    const positionStyles = {
      "top-right": "top: 10px; right: 10px;",
      "top-left": "top: 10px; left: 10px;",
      "bottom-right": "bottom: 10px; right: 10px;",
      "bottom-left": "bottom: 10px; left: 10px;",
    };

    notification.style.cssText = `
      position: fixed;
      ${positionStyles[position]}
      background: ${backgroundColor};
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
    }, options.duration || 2000);
  }
}
