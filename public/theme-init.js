try {
  const theme = localStorage.getItem("devildev.theme") === "light" ? "light" : "dark";
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
} catch {
  // Storage may be unavailable in privacy-restricted browsing contexts.
}
