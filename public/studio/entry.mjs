import { mountStudio } from './studio.mjs';

if (!customElements.get('hanzi-studio')) {
  customElements.define('hanzi-studio', class extends HTMLElement {
    connectedCallback() { if (!this.dispose) this.dispose = mountStudio(this); }
    disconnectedCallback() { this.dispose?.(); this.dispose = null; }
  });
}
