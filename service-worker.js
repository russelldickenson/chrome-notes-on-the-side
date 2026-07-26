// Service worker for Chrome Notes Sidebar extension

// Enable opening the side panel when clicking the extension's action icon
(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error("Error setting panel behavior:", error);
  }
})();
