export class Tooltip {
  private tooltip: HTMLElement | null = null;
  private hoverTimeout: number | null = null;

  constructor() {
    this.createTooltip();
  }

  private createTooltip(): void {
    this.tooltip = document.createElement("div");
    this.tooltip.id = "hover-translator-tooltip";
    this.tooltip.style.cssText = `
      position: fixed;
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      max-width: 300px;
      word-wrap: break-word;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(this.tooltip);
  }

  show(translation: string, event: MouseEvent): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }

    this.hoverTimeout = window.setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.textContent = translation;
        this.tooltip.style.opacity = "1";
        this.positionTooltip(event);
      }
    }, 300);
  }

  hide(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }

    if (this.tooltip) {
      this.tooltip.style.opacity = "0";
    }
  }

  private positionTooltip(event: MouseEvent): void {
    if (!this.tooltip) return;

    const rect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = event.clientX;
    let y = event.clientY + 20;

    if (x + rect.width > viewportWidth - 20) {
      x = event.clientX - rect.width;
    }

    if (y + rect.height > viewportHeight - 20) {
      y = event.clientY - rect.height - 20;
    }

    if (x < 10) x = 10;
    if (y < 10) y = 10;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  updatePosition(event: MouseEvent): void {
    if (this.tooltip && this.tooltip.style.opacity === "1") {
      this.positionTooltip(event);
    }
  }

  destroy(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    if (this.tooltip && document.body.contains(this.tooltip)) {
      document.body.removeChild(this.tooltip);
    }
  }
}
