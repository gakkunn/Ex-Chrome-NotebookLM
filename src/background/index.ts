chrome.runtime.onMessage.addListener((message: unknown) => {
  if (
    message &&
    typeof message === 'object' &&
    'action' in message &&
    (message as { action: string }).action === 'openSettings'
  ) {
    void chrome.runtime.openOptionsPage();
  }
});

chrome.commands.onCommand.addListener(command => {
  if (command === 'reload_extension_dev') {
    chrome.runtime.reload();
  }
});

console.log('[NotebookLM Shortcut Extension] Background service worker loaded');
