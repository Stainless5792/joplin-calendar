/**
 * Screen-aware sizing for the holiday import and manager dialogs.
 *
 * Joplin measures #joplin-plugin-content while the dialog is in fit-to-content
 * mode. The dialog CSS provides fixed defaults so the first measurement is
 * sane; this script scales html/body down when the screen or parent window is
 * smaller. The root element carries data-max-width / data-max-height.
 */
(function () {
  "use strict";

  function applySize() {
    var root = document.querySelector("[data-dialog-size]");
    if (!root) return;

    var maxWidth = Number(root.getAttribute("data-max-width")) || 520;
    var maxHeight = Number(root.getAttribute("data-max-height")) || 520;
    var screenWidth =
      window.screen && window.screen.availWidth
        ? window.screen.availWidth
        : 1200;
    var screenHeight =
      window.screen && window.screen.availHeight
        ? window.screen.availHeight
        : 800;

    var width = Math.min(
      maxWidth,
      Math.max(300, Math.round(screenWidth * 0.88))
    );
    var height = Math.min(
      maxHeight,
      Math.max(260, Math.round(screenHeight * 0.72))
    );

    try {
      if (window.parent && window.parent !== window) {
        var parentWidth = Number(window.parent.innerWidth) || 0;
        var parentHeight = Number(window.parent.innerHeight) || 0;
        if (parentWidth > 0) {
          width = Math.min(width, Math.max(300, Math.round(parentWidth * 0.9)));
        }
        if (parentHeight > 0) {
          height = Math.min(
            height,
            Math.max(260, Math.round(parentHeight * 0.8))
          );
        }
      }
    } catch (error) {
      // Isolated webview: screen dimensions are the best approximation.
    }

    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.width = width + "px";
      document.documentElement.style.height = height + "px";
    }
    if (document.body && document.body.style) {
      document.body.style.width = width + "px";
      document.body.style.height = height + "px";
    }
  }

  function boot() {
    if (!document.querySelector("[data-dialog-size]")) return;
    applySize();
  }

  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(boot);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  boot();
})();
