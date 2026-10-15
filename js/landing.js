/* Progressive enhancement for the public landing. No editor logic is changed. */
(() => {
  const root = document.querySelector("#auth-modal.landing-v2");
  if (!root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = root.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        instance.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    revealItems.forEach((item) => observer.observe(item));
  }

  const authIn = document.querySelector("#auth-tab-in");
  const authUp = document.querySelector("#auth-tab-up");
  authIn?.addEventListener("click", () => {
    authIn.setAttribute("aria-selected", "true");
    authUp?.setAttribute("aria-selected", "false");
  });
  authUp?.addEventListener("click", () => {
    authUp.setAttribute("aria-selected", "true");
    authIn?.setAttribute("aria-selected", "false");
  });

  root.querySelectorAll("[data-open-auth]").forEach((control) => {
    control.addEventListener("click", () => {
      const mode = control.getAttribute("data-open-auth");
      if (mode === "up") document.querySelector("#auth-tab-up")?.click();
      if (mode === "in") document.querySelector("#auth-tab-in")?.click();
      window.setTimeout(() => {
        const panel = document.querySelector("#landing-auth-panel");
        panel?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        document.querySelector("#auth-email")?.focus({ preventScroll: true });
      }, 0);
    });
  });
})();
