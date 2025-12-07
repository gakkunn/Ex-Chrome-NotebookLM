import type { Feature } from '@/inject/types/global';
import { isWideScreen } from '@/inject/utils/common';
import { ti } from '@/inject/utils/i18n';
import { cloneSettings, getBindings, getShortcutDefinition } from '@/inject/utils/shortcuts';
import { bindingsToDisplayText, isModKey } from '@/shared/keyboard';
import { MESSAGE_SOURCE, MESSAGE_TYPES } from '@/shared/messages';
import {
  DEFAULT_SETTINGS,
  type KeyBinding,
  type SettingsData,
  type ShortcutId,
} from '@/shared/settings';

interface ActionRow {
  labelKey: string;
  fallbackLabel: string;
  id?: ShortcutId;
  bindings?: KeyBinding[];
  staticBindings?: string;
}

const SHORTCUT_DIALOG_BINDINGS: KeyBinding[] = [{ key: '/', code: 'Slash', mod: true }];

const COMMON_ACTIONS: ActionRow[] = [
  {
    labelKey: 'modal_action_keyboard_shortcuts',
    fallbackLabel: 'Keyboard shortcuts',
    bindings: SHORTCUT_DIALOG_BINDINGS,
  },
  { labelKey: 'shortcut_scrollTop', fallbackLabel: 'Scroll to Top', id: 'scrollTop' },
  {
    labelKey: 'shortcut_scrollBottom',
    fallbackLabel: 'Scroll to Bottom',
    id: 'scrollBottom',
  },
  { labelKey: 'shortcut_scrollUp', fallbackLabel: 'Scroll Up', id: 'scrollUp' },
  { labelKey: 'shortcut_scrollDown', fallbackLabel: 'Scroll Down', id: 'scrollDown' },
  {
    labelKey: 'shortcut_scrollHalfUp',
    fallbackLabel: 'Scroll Half Page Up',
    id: 'scrollHalfUp',
  },
  {
    labelKey: 'shortcut_scrollHalfDown',
    fallbackLabel: 'Scroll Half Page Down',
    id: 'scrollHalfDown',
  },
  { labelKey: 'shortcut_toggleHeader', fallbackLabel: 'Toggle Header', id: 'toggleHeader' },
  { labelKey: 'shortcut_addSources', fallbackLabel: 'Add Sources', id: 'addSources' },
];

const LARGE_ACTIONS: ActionRow[] = [
  {
    labelKey: 'modal_action_toggle_right_sidebar',
    fallbackLabel: 'Toggle Right Side Bar',
    id: 'toggleRightSidebar',
  },
  {
    labelKey: 'modal_action_toggle_left_sidebar',
    fallbackLabel: 'Toggle Left Side Bar',
    id: 'toggleLeftSidebar',
  },
  {
    labelKey: 'modal_action_delete_chat_history',
    fallbackLabel: 'Delete chat history',
    id: 'deleteChat',
  },
];

const SMALL_ACTIONS: ActionRow[] = [
  {
    labelKey: 'modal_action_move_right_tab',
    fallbackLabel: 'Move Right Tab',
    id: 'toggleRightSidebar',
  },
  {
    labelKey: 'modal_action_move_left_tab',
    fallbackLabel: 'Move Left Tab',
    id: 'toggleLeftSidebar',
  },
];

function bindingsToText(bindings: KeyBinding[]): string {
  return bindingsToDisplayText(bindings, {
    tokenSeparator: ' ',
    bindingSeparator: ' / ',
  });
}

export class ShortcutHelpModal implements Feature {
  private isModalOpen = false;
  private settings: SettingsData = cloneSettings(DEFAULT_SETTINGS);
  private contentContainer: HTMLDivElement | null = null;

  updateSettings(settings: SettingsData): void {
    this.settings = cloneSettings(settings);
    if (this.isModalOpen) {
      this.renderOpenModal();
    }
  }

  private resolveBindingText(row: ActionRow): string | null {
    if (row.bindings && row.bindings.length) {
      return bindingsToText(row.bindings);
    }

    const { id, staticBindings } = row;
    if (!id) return staticBindings ?? null;
    const def = getShortcutDefinition(id);
    if (!def) return null;
    if (!this.settings.featureToggles[def.category]) return null;

    const bindings = getBindings(this.settings, id);
    if (!Array.isArray(bindings) || !bindings.length) return staticBindings ?? null;

    return bindingsToText(bindings);
  }

  private createShortcutsTable(rows: ActionRow[], includeSettingsRow: boolean): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'shortcuts-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const actionTh = document.createElement('th');
    actionTh.textContent = ti('modal_column_action', 'Action');
    const shortcutTh = document.createElement('th');
    shortcutTh.textContent = ti('modal_column_shortcut', 'Shortcut');
    headerRow.appendChild(actionTh);
    headerRow.appendChild(shortcutTh);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (includeSettingsRow) {
      const settingsRow = document.createElement('tr');
      const itemTd = document.createElement('td');
      itemTd.textContent = ti('modal_settings_row_label', 'Setting Shortcut Key');
      const linkTd = document.createElement('td');
      linkTd.className = 'shortcut-key';
      const link = document.createElement('a');
      link.textContent = ti('modal_settings_row_link', 'Click Here');
      link.href = '#';
      link.style.color = '#38bdf8';
      link.style.textDecoration = 'underline';
      link.style.cursor = 'pointer';
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetOrigin = window.__nbcAllowedOrigin ?? window.location.origin;
        const nonce = window.__nbcNonce;
        if (!nonce) return;
        window.postMessage(
          {
            source: MESSAGE_SOURCE,
            type: MESSAGE_TYPES.openSettings,
            nonce,
          },
          targetOrigin,
        );
      });
      linkTd.appendChild(link);
      settingsRow.appendChild(itemTd);
      settingsRow.appendChild(linkTd);
      tbody.appendChild(settingsRow);
    }

    rows.forEach(row => {
      const text = this.resolveBindingText(row);
      if (!text) return;

      const tr = document.createElement('tr');
      const itemTd = document.createElement('td');
      itemTd.textContent = ti(row.labelKey, row.fallbackLabel);
      const shortcutTd = document.createElement('td');
      shortcutTd.className = 'shortcut-key';
      shortcutTd.textContent = text;
      tr.appendChild(itemTd);
      tr.appendChild(shortcutTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    return table;
  }

  private createModalElement(): HTMLDivElement {
    const specificShortcuts = isWideScreen() ? LARGE_ACTIONS : SMALL_ACTIONS;
    const specificTitle = isWideScreen()
      ? ti('modal_section_large', 'Large Screen Shortcuts')
      : ti('modal_section_small', 'Small Screen Shortcuts');

    const overlay = document.createElement('div');
    overlay.id = 'notebooklm-shortcuts-overlay';
    overlay.className = 'shortcuts-overlay';

    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';

    const header = document.createElement('div');
    header.className = 'shortcuts-header';

    const h2 = document.createElement('h2');
    h2.textContent = ti('modal_title_shortcuts', 'NotebookLM Keyboard Shortcuts');

    const closeButton = document.createElement('button');
    closeButton.className = 'shortcuts-close';
    closeButton.setAttribute('aria-label', ti('aria_close', 'Close'));
    closeButton.textContent = '×';

    header.appendChild(h2);
    header.appendChild(closeButton);

    const content = document.createElement('div');
    content.className = 'shortcuts-content';
    this.renderContent(content, specificTitle, specificShortcuts);

    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);

    this.contentContainer = content;

    return overlay;
  }

  private renderContent(
    container: HTMLDivElement,
    specificTitle: string,
    specificShortcuts: ActionRow[],
  ): void {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const commonSection = document.createElement('div');
    commonSection.className = 'shortcuts-section';
    const commonH3 = document.createElement('h3');
    commonH3.textContent = ti('modal_section_common', 'Common Shortcuts');
    commonSection.appendChild(commonH3);
    commonSection.appendChild(this.createShortcutsTable(COMMON_ACTIONS, true));

    const specificSection = document.createElement('div');
    specificSection.className = 'shortcuts-section';
    const specificH3 = document.createElement('h3');
    specificH3.textContent = specificTitle;
    specificSection.appendChild(specificH3);
    specificSection.appendChild(this.createShortcutsTable(specificShortcuts, false));

    container.appendChild(commonSection);
    container.appendChild(specificSection);
  }

  private showModal(): void {
    if (this.isModalOpen) return;

    const existingModal = document.getElementById('notebooklm-shortcuts-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const modalElement = this.createModalElement();
    document.body.appendChild(modalElement);

    const closeButton = modalElement.querySelector<HTMLButtonElement>('.shortcuts-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideModal());
    }

    modalElement.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modalElement) {
        this.hideModal();
      }
    });

    this.isModalOpen = true;
  }

  private hideModal(): void {
    const modal = document.getElementById('notebooklm-shortcuts-overlay');
    if (modal) {
      modal.remove();
    }
    this.contentContainer = null;
    this.isModalOpen = false;
  }

  private onKeydown = (e: KeyboardEvent): void => {
    if (isModKey(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === '/') {
      e.preventDefault();
      if (this.isModalOpen) {
        this.hideModal();
      } else {
        this.showModal();
      }
      return;
    }

    if (e.key === 'Escape' && this.isModalOpen) {
      this.hideModal();
      return;
    }
  };

  private onResize = (): void => {
    if (this.isModalOpen) {
      this.renderOpenModal();
    }
  };

  onLocaleChange(): void {
    if (this.isModalOpen) {
      this.renderOpenModal();
    }
  }

  private renderOpenModal(): void {
    if (!this.contentContainer) return;
    const specificShortcuts = isWideScreen() ? LARGE_ACTIONS : SMALL_ACTIONS;
    const specificTitle = isWideScreen()
      ? ti('modal_section_large', 'Large Screen Shortcuts')
      : ti('modal_section_small', 'Small Screen Shortcuts');
    this.renderContent(this.contentContainer, specificTitle, specificShortcuts);
  }

  init(): void {
    document.addEventListener('keydown', this.onKeydown, { passive: false });
    window.addEventListener('resize', this.onResize);
  }

  destroy(): void {
    this.hideModal();
    document.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('resize', this.onResize);
  }
}
