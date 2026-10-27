// Applies the saved appearance before first paint to avoid a theme flash.
(function () {
  var saved;
  try {
    saved = localStorage.getItem("pitwall-theme");
  } catch (error) {
    // Appearance still follows the system when storage is blocked.
  }
  var theme =
    saved === "light" || saved === "dark"
      ? saved
      : matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", theme === "light" ? "#f6f6f3" : "#0f1113");
})();
