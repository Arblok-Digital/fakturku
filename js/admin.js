    import { adminCode, PACKAGES } from "./modules/credit-ledger.js";
    import * as backend from "./modules/backend.js";

    const $ = (s) => document.querySelector(s);
    const LOG_KEY = "fakturku:adminlog";

    function fmtTime(iso) {
      const d = new Date(iso);
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " " +
             d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }

    /* ================= MODE SERVER ================= */

    async function startRemote() {
      $("#mode-mark").textContent = "SERVER";
      await backend.init();

      backend.onAuthChange(async (session) => {
        if (!session) {
          $("#adm-login").hidden = false;
          $("#adm-dash").hidden = true;
          $("#adm-denied").hidden = true;
          return;
        }
        $("#adm-login").hidden = true;
        const me = await backend
          .client().from("profiles").select("role, email, full_name").eq("id", session.user.id).single();
        const role = me.data?.role;
        if (role !== "admin") {
          $("#adm-denied").hidden = false;
          $("#ad-denied-msg").textContent =
            `Akun ${me.data?.email || session.user.email} punya role "${role || "?"}" — bukan admin.`;
          return;
        }
        $("#adm-denied").hidden = true;
        $("#adm-dash").hidden = false;
        $("#ad-who").textContent = me.data?.email || session.user.email;
        await loadDash();
      });
    }

    async function loadDash() {
      try {
        const [stats, reqs, users, txs] = await Promise.all([
          backend.adminStats(),
          backend.adminPending(),
          backend.adminUsers(),
          backend.adminTransactions(),
        ]);
        $("#st-users").textContent = stats.users;
        $("#st-invoices").textContent = stats.invoices;
        $("#st-pending").textContent = stats.pending;

        $("#tu-body").innerHTML = reqs.map((r) => {
          const who = r.profiles?.full_name || r.profiles?.role || r.user_id.slice(0, 8);
          const canAct = r.status === "pending";
          return `<tr>
            <td>${fmtTime(r.created_at)}</td>
            <td>${esc(who)}</td>
            <td class="mono">Rp ${Number(r.balance_amount ?? r.price ?? 0).toLocaleString("id-ID")}</td>
            <td class="mono">Rp ${Number(r.price).toLocaleString("id-ID")}</td>
            <td class="mono">${r.code}</td>
            <td><span class="chip ${r.status}">${r.status}</span></td>
            <td>${canAct ? `<span class="row-actions">
              <button class="act ok" data-appr="${r.code}">Approve</button>
              <button class="act no" data-rej="${r.code}">Tolak</button>
            </span>` : ""}</td>
          </tr>`;
        }).join("");
        $("#tu-empty").hidden = reqs.length > 0;

        $("#us-body").innerHTML = users.map((u) => `
          <tr>
            <td>${esc(u.name)}</td>
            <td class="mono">${esc(u.email)}</td>
            <td><select class="mini" data-role="${u.id}">
              <option value="pic" ${u.role === "pic" ? "selected" : ""}>pic</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
              <option value="viewer" ${u.role === "viewer" ? "selected" : ""}>viewer</option>
            </select></td>
            <td class="mono">Rp ${Number(u.balance || 0).toLocaleString("id-ID")}<br><span class="muted">trial ${Number(u.trialCredits || 0)}</span></td>
            <td><span class="cred-cell">
              <input type="number" data-adj="${u.id}" value="10000" step="1000">
              <button class="act" data-adjgo="${u.id}">Kirim</button>
            </span></td>
          </tr>`).join("");
        $("#us-empty").hidden = users.length > 0;

        $("#tx-body").innerHTML = txs.map((t) => {
          const monetary = ["topup", "issue", "unlock_category", "unlock_all"].includes(t.reason);
          const amount = monetary ? Number(t.balance_delta) || 0 : Number(t.trial_delta) || Number(t.delta) || 0;
          const sisa = monetary ? t.balance_after : (t.trial_after ?? t.credits_after);
          const label = monetary ? "Rp " + Math.abs(amount).toLocaleString("id-ID") : Math.abs(amount) + " dok";
          return `
          <tr>
            <td>${fmtTime(t.created_at)}</td>
            <td>${esc(t.profiles?.full_name || t.user_id.slice(0, 8))}</td>
            <td class="mono" style="color:${amount > 0 ? "var(--teal-600)" : "var(--danger-600)"}">${amount > 0 ? "+" : "-"}${label} <span class="muted">${esc(t.reason || "")}</span></td>
            <td class="mono">${esc(t.ref || "")}</td>
            <td class="mono">${sisa == null ? "—" : (monetary ? "Rp " + Number(sisa).toLocaleString("id-ID") : sisa + " dok")}</td>
          </tr>`;
        }).join("");
        $("#tx-empty").hidden = txs.length > 0;
      } catch (e) {
        console.error("dash load", e);
        alert("Gagal memuat data: " + (e?.message || ""));
      }
    }

    function esc(s) {
      return String(s ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    $("#ad-go").addEventListener("click", async () => {
      const err = $("#ad-err");
      err.hidden = true;
      try {
        await backend.signIn($("#ad-email").value.trim(), $("#ad-pass").value);
      } catch (e) {
        err.textContent = e?.message || "Gagal masuk.";
        err.hidden = false;
      }
    });
    $("#ad-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#ad-go").click(); });

    $("#ad-signout").addEventListener("click", () => backend.signOut());
    $("#ad-logout").addEventListener("click", () => backend.signOut());
    $("#ad-refresh").addEventListener("click", loadDash);

    $("#tu-body").addEventListener("click", async (e) => {
      const a = e.target.dataset && e.target.dataset.appr;
      const r = e.target.dataset && e.target.dataset.rej;
      try {
        if (a) {
          if (!confirm(`Approve ${a}? Kuota user bertambah otomatis.`)) return;
          await backend.approveTopup(a);
        } else if (r) {
          if (!confirm(`Tolak ${r}?`)) return;
          await backend.rejectTopup(r);
        } else return;
        await loadDash();
      } catch (err) {
        alert("Gagal: " + (err?.message || ""));
      }
    });

    $("#us-body").addEventListener("change", async (e) => {
      const id = e.target.dataset && e.target.dataset.role;
      if (!id) return;
      try {
        await backend.setRole(id, e.target.value);
      } catch (err) {
        alert("Gagal set role: " + (err?.message || ""));
      }
    });

    $("#us-body").addEventListener("click", async (e) => {
      const id = e.target.dataset && e.target.dataset.adjgo;
      if (!id) return;
      const inp = $(`input[data-adj="${id}"]`);
      const delta = Number(inp?.value) || 0;
      if (!delta) return;
      try {
        await backend.adjustBalance(id, delta, "manual admin");
        await loadDash();
      } catch (err) {
        alert("Gagal adjust: " + (err?.message || ""));
      }
    });

    /* ================= MODE LOKAL ================= */

    function startLocal() {
      $("#mode-mark").textContent = "LOKAL";
      $("#adm-local").hidden = false;

      function loadLog() {
        try { return JSON.parse(localStorage.getItem(LOG_KEY)) || []; }
        catch { return []; }
      }
      function saveLog(l) {
        try { localStorage.setItem(LOG_KEY, JSON.stringify(l)); }
        catch (e) { console.warn("log save gagal", e); }
      }

      $("#a-pkg").innerHTML = PACKAGES.map((p, i) =>
        `<option value="${i}">${esc(p.label || p.id)} — Rp ${Number(p.balance_amount ?? p.price).toLocaleString("id-ID")}</option>`
      ).join("");

      function renderLog() {
        const log = loadLog();
        $("#log-body").innerHTML = log.map((r, i) => `
          <tr>
            <td>${fmtTime(r.at)}</td>
            <td class="mono">${r.id}</td>
            <td>Rp ${Number(r.balance_amount ?? r.price ?? 0).toLocaleString("id-ID")} · ${esc(r.id)}</td>
            <td class="mono">${r.code}</td>
            <td><button class="act no" data-rm="${i}">Hapus</button></td>
          </tr>`).join("");
        $("#log-empty").hidden = log.length > 0;
        const total = log.reduce((s, r) => s + Number(r.price || 0), 0);
        $("#log-sum").textContent = log.length
          ? `${log.length} approve · total Rp ${total.toLocaleString("id-ID")}` : "";
      }

      $("#a-go").addEventListener("click", () => {
        const id = $("#a-id").value.trim().toUpperCase();
        if (!/^FKT-[A-Z0-9]{4,10}$/.test(id)) {
          alert("ID tidak valid. Format: FKT-XXXXXX");
          return;
        }
        const pkg = PACKAGES[Number($("#a-pkg").value)] || PACKAGES[0];
        const code = adminCode(id);
        const log = loadLog();
        log.unshift({ id, code, balance_amount: Number(pkg.balance_amount ?? pkg.price) || 0, price: pkg.price, at: new Date().toISOString() });
        saveLog(log.slice(0, 200));
        $("#a-code").textContent = code;
        $("#a-out").hidden = false;
        renderLog();
      });

      $("#a-copy").addEventListener("click", async () => {
        const code = $("#a-code").textContent;
        try { await navigator.clipboard.writeText(code); } catch { /* noop */ }
        $("#a-copy").textContent = "Tersalin!";
        setTimeout(() => { $("#a-copy").textContent = "Salin Kode"; }, 1500);
      });

      $("#log-body").addEventListener("click", (e) => {
        const i = e.target.dataset && e.target.dataset.rm;
        if (i == null) return;
        const log = loadLog();
        log.splice(Number(i), 1);
        saveLog(log);
        renderLog();
      });

      $("#log-clear").addEventListener("click", () => {
        if (!confirm("Bersihkan seluruh riwayat approval?")) return;
        saveLog([]);
        renderLog();
      });

      renderLog();
    }

    /* ================= BOOT ================= */

    if (backend.isRemote()) {
      startRemote().catch((e) => {
        console.error(e);
        $("#ad-err").textContent = "Backend gagal diinit: " + (e?.message || "");
        $("#ad-err").hidden = false;
        $("#adm-login").hidden = false;
      });
    } else {
      startLocal();
    }
