// src/config/haygen-selectors.ts
var SELECTORS = {
  version: "1.0.0",
  // Selectors for prompt textarea/input field
  promptField: [
    'textarea[placeholder*="prompt" i]',
    'textarea[placeholder*="description" i]',
    'textarea[placeholder*="what" i]',
    'textarea[data-testid*="prompt"]',
    'textarea[id*="prompt"]',
    'textarea[name*="prompt"]',
    'textarea[class*="prompt"]',
    ".prompt-input textarea",
    ".prompt-field textarea",
    "#prompt-textarea",
    "textarea"
  ],
  // Selectors for file upload input
  fileInput: [
    'input[type="file"][accept*="image"]',
    'input[type="file"][accept*="video"]',
    'input[type="file"][accept*="media"]',
    'input[type="file"]',
    'input[data-testid*="upload"]',
    'input[data-testid*="file"]',
    'input[id*="upload"]',
    'input[id*="file"]',
    '.upload-input input[type="file"]',
    '.file-upload input[type="file"]'
  ],
  // Selectors for share/result link
  shareLink: [
    'a[href*="share"]',
    'a[href*="view"]',
    "a[data-share-link]",
    'a[data-testid*="share"]',
    ".share-link",
    ".share-button",
    '[class*="share"] a',
    "button[data-share-link]",
    ".result-link",
    ".public-link"
  ],
  // Selectors for download link
  downloadLink: [
    'a[href*="download"]',
    "a[data-download-link]",
    'a[data-testid*="download"]',
    ".download-link",
    ".download-button",
    '[class*="download"] a',
    "button[data-download-link]",
    "a[download]"
  ],
  // Selectors for result container (where results appear)
  resultContainer: [
    ".result-container",
    ".result-wrapper",
    ".video-result",
    ".output-container",
    '[class*="result"]',
    '[data-testid*="result"]',
    ".generated-content"
  ],
  // Selectors for upload button/area
  uploadButton: [
    'button[data-testid*="upload"]',
    'button[class*="upload"]',
    ".upload-button",
    ".upload-area",
    'label[for*="file"]',
    ".dropzone"
  ]
};
function getSelectors(type) {
  return SELECTORS[type] || [];
}

// src/utils/dom-helpers.ts
function findElementByMultipleSelectors(selectors) {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}
async function waitForElementBySelectors(selectors, timeout = 1e4) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = findElementByMultipleSelectors(selectors);
    if (element) {
      return element;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Element not found with any selector: ${selectors.join(", ")}`);
}
function triggerInputEvent(element) {
  const inputEvent = new Event("input", {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(inputEvent);
  const changeEvent = new Event("change", {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(changeEvent);
  element.focus();
  element.blur();
}
function setInputValue(element, value) {
  element.value = value;
  triggerInputEvent(element);
}
function scrollIntoView(element) {
  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  });
}

// src/content/notification-manager.ts
var NotificationManager = class {
  constructor() {
    this.notificationId = "elemental-notification";
    this.notification = null;
    this.hideTimeout = null;
  }
  /**
   * Show a notification overlay
   */
  show(message, options = {}) {
    const {
      duration = 3e3,
      position = "top",
      type = "info"
    } = options;
    this.hide();
    const notification = document.createElement("div");
    notification.id = this.notificationId;
    notification.textContent = message;
    const styles = {
      position: "fixed",
      zIndex: "10000",
      padding: "12px 24px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "14px",
      fontWeight: "500",
      color: "#fff",
      maxWidth: "400px",
      wordWrap: "break-word",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      cursor: "pointer"
    };
    switch (position) {
      case "top":
        styles.top = "20px";
        styles.left = "50%";
        styles.transform = "translateX(-50%)";
        break;
      case "bottom":
        styles.bottom = "20px";
        styles.left = "50%";
        styles.transform = "translateX(-50%)";
        break;
      case "center":
        styles.top = "50%";
        styles.left = "50%";
        styles.transform = "translate(-50%, -50%)";
        break;
    }
    switch (type) {
      case "success":
        styles.backgroundColor = "#10b981";
        break;
      case "error":
        styles.backgroundColor = "#ef4444";
        break;
      case "warning":
        styles.backgroundColor = "#f59e0b";
        break;
      case "info":
      default:
        styles.backgroundColor = "#3b82f6";
        break;
    }
    Object.assign(notification.style, styles);
    notification.addEventListener("click", () => this.hide());
    document.body.appendChild(notification);
    this.notification = notification;
    if (duration > 0) {
      this.hideTimeout = window.setTimeout(() => {
        this.hide();
      }, duration);
    }
  }
  /**
   * Show progress notification
   */
  showProgress(message, progress) {
    let progressMessage = message;
    if (progress !== void 0) {
      progressMessage = `${message} (${Math.round(progress)}%)`;
    }
    this.show(progressMessage, {
      type: "info",
      duration: 0
      // Don't auto-hide progress
    });
  }
  /**
   * Show success notification
   */
  showSuccess(message) {
    this.show(message, {
      type: "success",
      duration: 3e3
    });
  }
  /**
   * Show error notification
   */
  showError(message, action) {
    let errorMessage = message;
    if (action) {
      errorMessage = `${message} (Click to retry)`;
    }
    const notification = this.show(errorMessage, {
      type: "error",
      duration: 5e3
    });
    if (action && this.notification) {
      this.notification.addEventListener("click", action);
    }
  }
  /**
   * Hide notification
   */
  hide() {
    if (this.hideTimeout !== null) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    if (this.notification) {
      this.notification.style.opacity = "0";
      this.notification.style.transform = this.notification.style.transform?.replace(
        /translate[XY]?\([^)]+\)/,
        "translateY(-20px)"
      );
      setTimeout(() => {
        if (this.notification && this.notification.parentNode) {
          this.notification.parentNode.removeChild(this.notification);
        }
        this.notification = null;
      }, 300);
    }
  }
};
var notificationManager = new NotificationManager();

// src/content/haygen-prompt-filler.ts
var PromptFiller = class {
  /**
   * Fill prompt in Haygen interface
   * Returns true if successful, false if fallback to clipboard
   */
  async fillPrompt(prompt) {
    try {
      notificationManager.showProgress("\u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u043C\u043F\u0442\u0430...", 0);
      const success = await this.tryDomFill(prompt);
      if (success) {
        notificationManager.showSuccess("\u041F\u0440\u043E\u043C\u043F\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D!");
        return true;
      } else {
        await this.clipboardFallback(prompt);
        return false;
      }
    } catch (error) {
      console.error("Error filling prompt:", error);
      notificationManager.showError("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0438 \u043F\u0440\u043E\u043C\u043F\u0442\u0430");
      await this.clipboardFallback(prompt);
      return false;
    }
  }
  /**
   * Try to fill prompt using DOM manipulation
   */
  async tryDomFill(prompt) {
    try {
      if (document.readyState === "loading") {
        await new Promise((resolve) => {
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", resolve);
          } else {
            resolve(null);
          }
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      const selectors = getSelectors("promptField");
      let element = null;
      const foundElement = findElementByMultipleSelectors(selectors);
      if (foundElement && (foundElement instanceof HTMLTextAreaElement || foundElement instanceof HTMLInputElement)) {
        element = foundElement;
      } else {
        try {
          const waitedElement = await waitForElementBySelectors(selectors, 5e3);
          if (waitedElement instanceof HTMLTextAreaElement || waitedElement instanceof HTMLInputElement) {
            element = waitedElement;
          }
        } catch (error) {
          console.warn("Prompt field not found:", error);
          return false;
        }
      }
      if (!element) {
        return false;
      }
      scrollIntoView(element);
      element.value = "";
      setInputValue(element, prompt);
      if (element.value === prompt || element.value.includes(prompt.substring(0, 50))) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error in DOM fill:", error);
      return false;
    }
  }
  /**
   * Fallback: copy prompt to clipboard and show instructions
   */
  async clipboardFallback(prompt) {
    try {
      await navigator.clipboard.writeText(prompt);
      notificationManager.show(
        "\u041F\u0440\u043E\u043C\u043F\u0442 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430! \u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0435\u0433\u043E \u0432 \u043F\u043E\u043B\u0435 (Ctrl+V \u0438\u043B\u0438 Cmd+V)",
        {
          type: "info",
          duration: 8e3
        }
      );
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      notificationManager.showError(
        "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u043C\u043F\u0442. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0441\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0435\u0433\u043E \u0432\u0440\u0443\u0447\u043D\u0443\u044E \u0438\u0437 \u043C\u043E\u0434\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043E\u043A\u043D\u0430."
      );
    }
  }
};
var promptFiller = new PromptFiller();

// src/utils/file-helpers.ts
async function fetchAsBlob(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    throw new Error(`Error fetching file from ${url}: ${error}`);
  }
}
function createFileFromBlob(blob, filename, mimeType) {
  return new File([blob], filename, {
    type: mimeType || blob.type || "application/octet-stream",
    lastModified: Date.now()
  });
}
function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}
function guessMimeType(filename) {
  const extension = getFileExtension(filename);
  const mimeTypes = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    // Videos
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };
  return mimeTypes[extension] || "application/octet-stream";
}

// src/content/haygen-asset-loader.ts
var AssetLoader = class {
  /**
   * Load all assets into Haygen interface
   */
  async loadAssets(assets) {
    if (assets.length === 0) {
      return;
    }
    notificationManager.showProgress(`\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u0441\u0441\u0435\u0442\u043E\u0432 (0/${assets.length})...`, 0);
    let successfulUploads = 0;
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const progress = Math.round((i + 1) / assets.length * 100);
      try {
        notificationManager.showProgress(
          `\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u0441\u0441\u0435\u0442\u0430 ${i + 1}/${assets.length}: ${asset.filename}`,
          progress
        );
        await this.loadSingleAsset(asset);
        successfulUploads++;
        if (i < assets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        }
      } catch (error) {
        console.error(`Error loading asset ${asset.filename}:`, error);
        notificationManager.showError(
          `\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0435 ${asset.filename}. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u043C...`
        );
      }
    }
    if (successfulUploads === assets.length) {
      notificationManager.showSuccess(`\u0412\u0441\u0435 \u0430\u0441\u0441\u0435\u0442\u044B \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B (${assets.length})!`);
    } else {
      notificationManager.show(
        `\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E ${successfulUploads} \u0438\u0437 ${assets.length} \u0430\u0441\u0441\u0435\u0442\u043E\u0432`,
        { type: "warning", duration: 4e3 }
      );
    }
  }
  /**
   * Load a single asset
   */
  async loadSingleAsset(asset) {
    try {
      const blob = await fetchAsBlob(asset.url);
      const mimeType = guessMimeType(asset.filename);
      const file = createFileFromBlob(blob, asset.filename, mimeType);
      const fileInput = await this.findFileInput();
      if (!fileInput) {
        throw new Error("File input not found");
      }
      scrollIntoView(fileInput);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      const changeEvent = new Event("change", {
        bubbles: true,
        cancelable: true
      });
      fileInput.dispatchEvent(changeEvent);
      const inputEvent = new Event("input", {
        bubbles: true,
        cancelable: true
      });
      fileInput.dispatchEvent(inputEvent);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    } catch (error) {
      console.error("Error in loadSingleAsset:", error);
      throw error;
    }
  }
  /**
   * Find file input element
   */
  async findFileInput() {
    if (document.readyState === "loading") {
      await new Promise((resolve) => {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", resolve);
        } else {
          resolve(null);
        }
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    const selectors = getSelectors("fileInput");
    try {
      const foundElement = findElementByMultipleSelectors(selectors);
      if (foundElement instanceof HTMLInputElement && foundElement.type === "file") {
        return foundElement;
      }
      const waitedElement = await waitForElementBySelectors(selectors, 5e3);
      if (waitedElement instanceof HTMLInputElement && waitedElement.type === "file") {
        return waitedElement;
      }
    } catch (error) {
      console.warn("File input not found:", error);
      return null;
    }
    return null;
  }
};
var assetLoader = new AssetLoader();

// src/content/haygen-result-monitor.ts
var ResultMonitor = class {
  constructor() {
    this.observer = null;
    this.isMonitoring = false;
    this.taskId = null;
    this.publicationId = "";
    this.lastCheckedLinks = {};
  }
  /**
   * Start monitoring for results
   */
  startMonitoring(taskId, publicationId) {
    if (this.isMonitoring) {
      console.warn("Already monitoring, stopping previous monitor");
      this.stopMonitoring();
    }
    this.taskId = taskId;
    this.publicationId = publicationId;
    this.isMonitoring = true;
    this.injectSaveButton(taskId, publicationId);
    this.observer = new MutationObserver(() => {
      this.checkForResults();
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    this.checkForResults();
    console.log("Result monitoring started for task:", taskId, "publication:", publicationId);
  }
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isMonitoring = false;
    this.taskId = null;
    this.publicationId = "";
  }
  /**
   * Check for result links in DOM
   */
  checkForResults() {
    if (!this.isMonitoring || !this.taskId) {
      return;
    }
    const links = this.extractResultLinks();
    if (links.shareLink !== this.lastCheckedLinks.shareLink || links.downloadLink !== this.lastCheckedLinks.downloadLink) {
      this.lastCheckedLinks = links;
      if (links.shareLink) {
        this.sendResult({
          taskId: this.taskId,
          publicationId: this.publicationId,
          resultUrl: links.shareLink,
          downloadUrl: links.downloadLink,
          status: "success"
        }).catch((error) => {
          console.error("Failed to send result automatically:", error);
        });
      }
    }
  }
  /**
   * Extract share and download links from page
   */
  extractResultLinks() {
    const shareSelectors = getSelectors("shareLink");
    const downloadSelectors = getSelectors("downloadLink");
    let shareLink;
    let downloadLink;
    const shareElement = findElementByMultipleSelectors(shareSelectors);
    if (shareElement) {
      if (shareElement instanceof HTMLAnchorElement) {
        shareLink = shareElement.href;
      } else if (shareElement instanceof HTMLButtonElement) {
        shareLink = shareElement.getAttribute("data-share-link") || void 0;
      } else {
        const link = shareElement.querySelector("a");
        if (link) {
          shareLink = link.href;
        }
      }
    }
    const downloadElement = findElementByMultipleSelectors(downloadSelectors);
    if (downloadElement) {
      if (downloadElement instanceof HTMLAnchorElement) {
        downloadLink = downloadElement.href;
      } else if (downloadElement instanceof HTMLButtonElement) {
        downloadLink = downloadElement.getAttribute("data-download-link") || void 0;
      } else {
        const link = downloadElement.querySelector("a");
        if (link) {
          downloadLink = link.href;
        }
      }
    }
    if (!shareLink || !downloadLink) {
      const allLinks = document.querySelectorAll("a[href]");
      allLinks.forEach((link) => {
        const href = link.href;
        if (href.includes("share") && !shareLink) {
          shareLink = href;
        }
        if (href.includes("download") && !downloadLink) {
          downloadLink = href;
        }
      });
    }
    return { shareLink, downloadLink };
  }
  /**
   * Inject "Save to Portal" button
   */
  injectSaveButton(taskId, publicationId) {
    if (document.getElementById("elemental-save-button")) {
      return;
    }
    const tryInject = () => {
      const containers = [
        document.querySelector(".actions"),
        document.querySelector(".toolbar"),
        document.querySelector('[class*="action"]'),
        document.querySelector('[class*="toolbar"]'),
        document.querySelector('[class*="result"]'),
        document.body
      ];
      let container = null;
      for (const c of containers) {
        if (c) {
          container = c;
          break;
        }
      }
      if (!container) {
        setTimeout(tryInject, 1e3);
        return;
      }
      const button = document.createElement("button");
      button.id = "elemental-save-button";
      button.textContent = "\u{1F4BE} Save to Portal";
      button.style.cssText = `
        padding: 8px 16px;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        margin-left: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      `;
      button.addEventListener("click", async () => {
        const links = this.extractResultLinks();
        if (!links.shareLink) {
          notificationManager.showError("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0439\u0442\u0438 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442");
          return;
        }
        button.textContent = "Saving...";
        button.disabled = true;
        try {
          await this.sendResult({
            taskId,
            publicationId,
            resultUrl: links.shareLink,
            downloadUrl: links.downloadLink,
            status: "success"
          });
          button.textContent = "\u2713 Saved!";
          notificationManager.showSuccess("\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D \u0432 \u043F\u043E\u0440\u0442\u0430\u043B!");
        } catch (error) {
          console.error("Error saving result:", error);
          button.textContent = "\u{1F4BE} Save to Portal";
          button.disabled = false;
          notificationManager.showError("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430");
        }
      });
      container.appendChild(button);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryInject);
    } else {
      tryInject();
    }
  }
  /**
   * Send result to background script
   */
  async sendResult(result) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "HAYGEN_RESULT",
          payload: result
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve();
          } else {
            reject(new Error("Failed to send result"));
          }
        }
      );
    });
  }
};
var resultMonitor = new ResultMonitor();

// src/content/haygen.ts
function isHaygenPage() {
  return window.location.hostname.includes("haygen.com") || window.location.hostname.includes("heygen.com");
}
async function initializeAutomation() {
  if (!isHaygenPage()) {
    return;
  }
  if (isInitialized) {
    return;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        if (!isInitialized) {
          isInitialized = true;
          processStoredData();
        }
      }, 1e3);
    });
  } else {
    setTimeout(() => {
      if (!isInitialized) {
        isInitialized = true;
        processStoredData();
      }
    }, 1e3);
  }
}
async function getApiBaseUrl() {
  try {
    const result = await chrome.storage.local.get("api_base_url");
    if (result.api_base_url) {
      return result.api_base_url;
    }
  } catch (e) {
    console.warn("[Haygen] Failed to get API URL from storage:", e);
  }
  return "http://localhost:3000";
}
async function processStoredData() {
  try {
    console.log("[Haygen] Starting to process stored data...");
    let taskId = null;
    let publicationId = null;
    let settings = null;
    let storageKey = null;
    console.log("[Haygen] Checking chrome.storage.local...");
    const storage = await chrome.storage.local.get(null);
    console.log("[Haygen] All storage keys:", Object.keys(storage));
    const taskKeys = Object.keys(storage).filter((key) => key.startsWith("haygen_task_"));
    console.log("[Haygen] Found task keys:", taskKeys);
    if (taskKeys.length > 0) {
      for (const key of taskKeys) {
        const data = storage[key];
        console.log("[Haygen] Checking key:", key, "data:", data);
        if (data && data.taskId) {
          taskId = data.taskId;
          publicationId = data.publicationId || null;
          settings = data.settings || null;
          storageKey = key;
          if (data.apiBaseUrl) {
            await chrome.storage.local.set({ api_base_url: data.apiBaseUrl });
            console.log("[Haygen] API URL stored:", data.apiBaseUrl);
          }
          console.log("[Haygen] Found task IDs:", { taskId, publicationId, hasSettings: !!settings });
          break;
        }
      }
    }
    if (!taskId) {
      console.log("[Haygen] No data in chrome.storage, checking sessionStorage");
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("haygen_task_")) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key) || "{}");
            console.log("[Haygen] Checking sessionStorage key:", key, "data:", data);
            if (data && data.taskId) {
              taskId = data.taskId;
              publicationId = data.publicationId || null;
              settings = data.settings || null;
              storageKey = key;
              if (data.apiBaseUrl) {
                await chrome.storage.local.set({ api_base_url: data.apiBaseUrl });
                console.log("[Haygen] API URL stored from sessionStorage:", data.apiBaseUrl);
              }
              console.log("[Haygen] Found task IDs in sessionStorage:", { taskId, publicationId, hasSettings: !!settings });
              break;
            }
          } catch (e) {
            console.warn("[Haygen] Failed to parse sessionStorage item:", key, e);
          }
        }
      }
    }
    if (!taskId) {
      console.log("[Haygen] No task ID found in storage or sessionStorage");
      return;
    }
    console.log("[Haygen] Task IDs found:", { taskId, publicationId });
    notificationManager.show("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u0438\u0437 API...", {
      type: "info",
      duration: 2e3
    });
    let promptData;
    try {
      const apiBaseUrl = await getApiBaseUrl();
      const apiUrl = publicationId ? `${apiBaseUrl}/api/prompts/tasks/${taskId}/publications/${publicationId}/generate` : `${apiBaseUrl}/api/prompts/tasks/${taskId}/generate`;
      console.log("[Haygen] Fetching from API:", apiUrl, "with settings:", !!settings);
      const fetchOptions = settings ? {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ settings })
      } : {};
      const response = await fetch(apiUrl, fetchOptions);
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      promptData = await response.json();
      console.log("[Haygen] Prompt data received from API:", promptData);
    } catch (error) {
      console.error("[Haygen] Failed to fetch from API:", error);
      notificationManager.showError("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0435 \u0434\u0430\u043D\u043D\u044B\u0445 \u0438\u0437 API. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
      return;
    }
    const finalPublicationId = publicationId || "";
    resultMonitor.startMonitoring(taskId, finalPublicationId);
    notificationManager.show("\u0418\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438...", {
      type: "info",
      duration: 2e3
    });
    const promptFilled = await promptFiller.fillPrompt(promptData.prompt);
    if (promptData.assets && promptData.assets.length > 0) {
      await assetLoader.loadAssets(promptData.assets);
    }
    if (promptFilled) {
      notificationManager.showSuccess("\u0414\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B! \u041C\u043E\u0436\u043D\u043E \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E.");
    } else {
      notificationManager.show(
        "\u041F\u0440\u043E\u043C\u043F\u0442 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0435\u043D\u0430. \u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0435\u0433\u043E \u0432 \u043F\u043E\u043B\u0435 \u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0430\u0441\u0441\u0435\u0442\u044B.",
        {
          type: "info",
          duration: 5e3
        }
      );
    }
    if (storageKey) {
      console.log("[Haygen] Clearing storage key:", storageKey);
      try {
        await chrome.storage.local.remove(storageKey);
        if (taskId) {
          await chrome.storage.local.remove(`haygen_task_${taskId}`);
        }
        if (sessionStorage.getItem(storageKey)) {
          sessionStorage.removeItem(storageKey);
        }
        console.log("[Haygen] Storage cleared successfully");
      } catch (error) {
        console.warn("[Haygen] Failed to clear storage:", error);
      }
    }
  } catch (error) {
    console.error("Error processing stored data:", error);
    notificationManager.showError("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "HAYGEN_PREPARE") {
    const data = message.payload;
    const publicationId = data.publicationId || "";
    chrome.storage.local.set({
      [`haygen_task_${data.taskId}_${publicationId}`]: data
    }).then(() => {
      processStoredData();
      sendResponse({ success: true });
    });
    return true;
  }
  if (message.type === "EXTRACT_LINKS") {
    const links = resultMonitor.extractResultLinks();
    sendResponse(links);
    return true;
  }
});
var isInitialized = false;
var navigationObserver = null;
initializeAutomation();
var lastUrl = location.href;
navigationObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    isInitialized = false;
    setTimeout(initializeAutomation, 1e3);
  }
});
navigationObserver.observe(document, { subtree: true, childList: true });
