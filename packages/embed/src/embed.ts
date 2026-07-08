import type { CalculatorConfig } from '@calculo/shared';

export interface EmbedOptions {
  calculatorId?: string;
  config?: Partial<CalculatorConfig>;
  container: HTMLElement | string;
  theme?: string;
  width?: string | number;
  height?: string | number;
}

export class CalculatorEmbed {
  private container: HTMLElement;
  private options: EmbedOptions;

  constructor(options: EmbedOptions) {
    this.container = typeof options.container === 'string'
      ? document.querySelector(options.container)!
      : options.container;
    this.options = options;
    this.init();
  }

  private init() {
    this.container.innerHTML = `
      <div class="calculo-widget" style="width:${this.options.width ?? '100%'};height:${this.options.height ?? 600}px;">
        <div class="calculo-display"></div>
        <div class="calculo-buttons"></div>
      </div>
    `;
    this.render();
  }

  private render() {
    const display = this.container.querySelector('.calculo-display');
    const buttons = this.container.querySelector('.calculo-buttons');
    if (display) display.textContent = '0';
    if (buttons) {
      buttons.innerHTML = [
        '7', '8', '9', '/',
        '4', '5', '6', '*',
        '1', '2', '3', '-',
        '0', '.', '=', '+',
      ].map((label) => `<button class="calculo-btn">${label}</button>`).join('');
    }
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

export function createEmbed(options: EmbedOptions): CalculatorEmbed {
  return new CalculatorEmbed(options);
}
