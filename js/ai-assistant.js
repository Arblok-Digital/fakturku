import { init as initBackend, getSession } from "./modules/backend.js";

const assistantRoots = [...document.querySelectorAll("#ai-assistant")];
const root = assistantRoots.shift() || null;
// Defensive cleanup: only one assistant widget may exist, even after stale markup is combined.
assistantRoots.forEach((duplicate) => duplicate.remove());
const workspace = document.querySelector("#workspace");

if (root && workspace) {
  const toggle = root.querySelector("#ai-assistant-toggle");
  const panel = root.querySelector("#ai-assistant-panel");
  const close = root.querySelector("#ai-assistant-close");
  const tuck = root.querySelector("#ai-assistant-tuck");
  const form = root.querySelector("#ai-assistant-form");
  const input = root.querySelector("#ai-assistant-input");
  const sendButton = root.querySelector("#ai-assistant-send");
  const messagesEl = root.querySelector("#ai-assistant-messages");
  const status = root.querySelector("#ai-assistant-status");
  const history = [];

  // On phones, start tucked at the edge so the Share / document actions stay unobstructed.
  if (window.matchMedia("(max-width: 900px)").matches) root.classList.add("is-tucked");

  function syncVisibility() {
    root.hidden = workspace.hidden;
    if (workspace.hidden) panel.hidden = true;
  }

  function addMessage(role, text, suggestions = []) {
    const item = document.createElement("article");
    item.className = "ai-chat-message " + (role === "user" ? "is-user" : "is-assistant");
    const label = document.createElement("strong");
    label.className = "ai-chat-role";
    label.textContent = role === "user" ? "Kamu" : "Asisten FakturKu";
    const content = document.createElement("p");
    content.className = "ai-chat-copy";
    content.textContent = text;
    item.append(label, content);

    suggestions.forEach((suggestion) => {
      const card = document.createElement("div");
      card.className = "ai-suggestion";
      const field = document.createElement("strong");
      field.textContent = suggestion.label || suggestion.path;
      const value = document.createElement("p");
      value.textContent = suggestion.value;
      const reason = document.createElement("small");
      reason.textContent = suggestion.reason || "Periksa saran ini sebelum diterapkan.";
      const apply = document.createElement("button");
      apply.type = "button";
      apply.className = "ai-suggestion-apply";
      apply.textContent = "Terapkan saran";
      apply.addEventListener("click", () => {
        const target = [...document.querySelectorAll("#editor [data-bind]")]
          .find((el) => el.dataset.bind === suggestion.path);
        if (!target) {
          status.textContent = "Kolom tidak ditemukan. Saran tidak diterapkan.";
          return;
        }
        target.value = suggestion.value;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        apply.disabled = true;
        apply.textContent = "Diterapkan";
        status.textContent = "Saran diterapkan ke editor. Periksa kembali dokumennya.";
      });
      card.append(field, value, reason, apply);
      item.append(card);
    });

    messagesEl.append(item);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function collectContext() {
    const fields = {};
    document.querySelectorAll("#editor [data-bind]").forEach((el) => {
      const path = el.dataset.bind;
      if (!path || Object.hasOwn(fields, path)) return;
      const labelEl = el.id ? document.querySelector('label[for="' + CSS.escape(el.id) + '"]') : null;
      const label = (labelEl?.textContent || path).trim().slice(0, 100);
      const value = el.type === "checkbox" ? String(el.checked) : String(el.value || "");
      fields[path] = { label, value: value.slice(0, 300) };
    });
    return {
      template: document.querySelector("#tpl-grid")?.selectedOptions?.[0]?.textContent?.trim() || document.querySelector("#tpl-grid")?.value || "dokumen bisnis",
      category: document.querySelector("#tpl-filter")?.selectedOptions?.[0]?.textContent?.trim() || "umum",
      fields,
    };
  }

  async function ask(message) {
    const userMessage = { role: "user", text: message };
    history.push(userMessage);
    addMessage("user", message);
    const context = collectContext();
    input.value = "";
    input.disabled = true;
    sendButton.disabled = true;
    status.textContent = "Sedang menyusun jawaban…";

    try {
      await initBackend();
      const session = await getSession();
      if (!session?.access_token) {
        throw new Error("Sesi akun tidak terbaca. Muat ulang FakturKu dan masuk kembali ya.");
      }
      const response = await fetch("/api/gemini-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({ ...context, message, history: history.slice(-8) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Asisten belum bisa menjawab. Coba lagi.");
      const reply = typeof result.reply === "string" ? result.reply : "Aku bisa bantu menjelaskan kolom atau menyusun saran isian.";
      const suggestions = Array.isArray(result.suggestions) ? result.suggestions.map((item) => ({
        path: String(item.path || ""),
        label: context.fields[item.path]?.label || item.path,
        value: String(item.value || ""),
        reason: String(item.reason || ""),
      })).filter((item) => item.path && context.fields[item.path] && item.value) : [];
      history.push({ role: "model", text: reply });
      addMessage("assistant", reply, suggestions);
      const remaining = Number.isFinite(Number(result.remaining)) ? Number(result.remaining) : null;
      status.textContent = (suggestions.length ? "Tinjau saran sebelum menerapkannya." : "Jawaban AI · periksa informasi sebelum digunakan.")
        + (remaining === null ? "" : " · Sisa hari ini: " + remaining + "/10");
    } catch (error) {
      const errorText = error instanceof Error && error.message
        ? error.message
        : "Maaf, asisten sedang tidak tersedia. Coba lagi beberapa saat ya.";
      addMessage("assistant", errorText);
      status.textContent = errorText.includes("Jatah asisten AI hari ini sudah habis")
        ? "Batas harian tercapai · 0/10 tersisa"
        : "Asisten sedang tidak tersedia. Pesanmu belum mendapat jawaban.";
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  toggle.addEventListener("click", () => {
    if (root.classList.contains("is-tucked")) root.classList.remove("is-tucked");
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) input.focus();
  });
  tuck.addEventListener("click", () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    root.classList.add("is-tucked");
    status.textContent = "Asisten disembunyikan di tepi layar. Ketuk tab untuk membuka kembali.";
  });
  close.addEventListener("click", () => {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (message && !input.disabled) ask(message);
  });

  const observer = new MutationObserver(syncVisibility);
  observer.observe(workspace, { attributes: true, attributeFilter: ["hidden"] });
  syncVisibility();
  addMessage("assistant", "Halo! Aku bisa bantu menyusun saran isian sesuai dokumen yang sedang kamu buka. Saran tidak akan diterapkan sebelum kamu menekan “Terapkan saran”. Saat bertanya, nilai kolom editor yang terlihat dapat dikirim ke layanan Gemini. Hindari memasukkan data rahasia yang tidak diperlukan.");
}
