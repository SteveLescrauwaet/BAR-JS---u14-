const cfg = window.APP_CONFIG;

firebase.initializeApp(cfg.firebaseConfig);
const db = firebase.database();

const EVENT_ID = "u14-2026-10-17";

const slots = [
  { id: "09-12", label: "09h00 → 12h00", quota: 4 },
  { id: "12-15", label: "12h00 → 15h00", quota: 4 },
  { id: "15-18", label: "15h00 → 18h00", quota: 3 },
  { id: "18-fin", label: "18h00 → fin", quota: 3 }
];

let registrations = {};
let reserveRegistrations = {};
let adminUnlocked = false;

const el = (id) => document.getElementById(id);
const slotsEl = el("slots");
const signupDialog = el("signupDialog");
const reserveDialog = el("reserveDialog");
const adminDialog = el("adminDialog");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[c]);
}

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function regsForSlot(slotId) {
  const slotRegs = registrations?.[slotId] || {};
  return Object.entries(slotRegs).map(([id, data]) => ({ id, ...data }));
}

function render() {
  slotsEl.innerHTML = slots.map(slot => {
    const regs = regsForSlot(slot.id);
    const full = regs.length >= slot.quota;
    const pct = Math.min(100, Math.round((regs.length / slot.quota) * 100));

    return `
      <article class="slot-card ${full ? "full" : ""}">
        <div class="slot-top">
          <div>
            <div class="slot-time">${slot.label}</div>
            <div>${regs.length} / ${slot.quota} inscrit${regs.length > 1 ? "s" : ""}</div>
          </div>

          <span class="badge ${full ? "full" : "open"}">
            ${full
              ? "COMPLET"
              : `${slot.quota - regs.length} place${slot.quota - regs.length > 1 ? "s" : ""}`
            }
          </span>
        </div>

        <div class="progress">
          <div style="width:${pct}%"></div>
        </div>

        <ul class="names">
          ${regs.length
            ? regs.map(r => `
                <li>
                  👤 ${escapeHtml(r.firstName)} ${escapeHtml(r.lastName)}
                  ${r.playerName ? `<small>(${escapeHtml(r.playerName)})</small>` : ""}
                </li>
              `).join("")
            : "<li>Aucune inscription pour le moment</li>"
          }
        </ul>

        <button
          class="${full ? "secondary-btn" : "primary-btn"}"
          ${full ? "disabled" : ""}
          onclick="openSignup('${slot.id}')">
          ${full ? "Créneau complet" : "Je m'inscris"}
        </button>
      </article>
    `;
  }).join("");

  if (adminUnlocked) renderAdmin();
}

window.openSignup = function(slotId) {
  const slot = slots.find(s => s.id === slotId);
  if (!slot) return;

  if (regsForSlot(slot.id).length >= slot.quota) {
    showToast("Ce créneau est déjà complet.");
    return;
  }

  el("signupForm").reset();
  el("slotId").value = slotId;
  el("signupTitle").textContent = `Inscription – ${slot.label}`;
  el("signupError").textContent = "";
  signupDialog.showModal();
};

el("closeSignup").addEventListener("click", () => signupDialog.close());

el("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const slotId = el("slotId").value;
  const firstName = el("firstName").value.trim();
  const lastName = el("lastName").value.trim();
  const playerName = el("playerName").value.trim();

  const slot = slots.find(s => s.id === slotId);

  if (!slot || !firstName || !lastName) return;

  const slotRef = db.ref(`barEvents/${EVENT_ID}/slots/${slotId}/registrations`);

  try {
    const result = await slotRef.transaction((current) => {
      current = current || {};

      const count = Object.keys(current).length;

      if (count >= slot.quota) {
        return;
      }

      const newKey = slotRef.push().key;

      current[newKey] = {
        firstName,
        lastName,
        playerName: playerName || "",
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };

      return current;
    });

    if (!result.committed) {
      el("signupError").textContent =
        "Désolé, ce créneau vient d'être complété.";
      return;
    }

    signupDialog.close();
    showToast(`Inscription confirmée pour ${slot.label}`);

  } catch (error) {
    console.error(error);
    el("signupError").textContent =
      "L'inscription n'a pas pu être enregistrée.";
  }
});


function reserveEntries() {
  return Object.entries(reserveRegistrations || {}).map(([id, data]) => ({ id, ...data }));
}

function slotLabel(slotId) {
  return slots.find(s => s.id === slotId)?.label || slotId;
}

function updateReserveCount() {
  const count = reserveEntries().length;
  const target = el("reserveCount");
  if (!target) return;

  target.textContent = count
    ? `${count} personne${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""} en renfort`
    : "Aucune personne inscrite en renfort pour le moment.";
}

el("reserveBtn").addEventListener("click", () => {
  el("reserveForm").reset();
  el("reserveError").textContent = "";
  reserveDialog.showModal();
});

el("closeReserve").addEventListener("click", () => reserveDialog.close());

el("reserveForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = el("reserveFirstName").value.trim();
  const lastName = el("reserveLastName").value.trim();
  const playerName = el("reservePlayerName").value.trim();

  const selectedSlots = [
    ...document.querySelectorAll('input[name="reserveSlot"]:checked')
  ].map(input => input.value);

  if (!firstName || !lastName) return;

  if (!selectedSlots.length) {
    el("reserveError").textContent = "Sélectionnez au moins un créneau.";
    return;
  }

  try {
    const newRef = db.ref(`barEvents/${EVENT_ID}/reserve`).push();

    await newRef.set({
      firstName,
      lastName,
      playerName: playerName || "",
      slots: selectedSlots,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });

    reserveDialog.close();
    showToast("Vos disponibilités ont bien été enregistrées.");
  } catch (error) {
    console.error(error);
    el("reserveError").textContent = "L'enregistrement n'a pas pu être effectué.";
  }
});

el("adminBtn").addEventListener("click", () => {
  el("adminPin").value = "";
  el("adminError").textContent = "";

  if (adminUnlocked) {
    el("adminLogin").classList.add("hidden");
    el("adminPanel").classList.remove("hidden");
    renderAdmin();
  } else {
    el("adminLogin").classList.remove("hidden");
    el("adminPanel").classList.add("hidden");
  }

  adminDialog.showModal();
});

el("closeAdmin").addEventListener("click", () => adminDialog.close());

el("adminLoginBtn").addEventListener("click", () => {
  if (el("adminPin").value === cfg.ADMIN_PIN) {
    adminUnlocked = true;
    el("adminLogin").classList.add("hidden");
    el("adminPanel").classList.remove("hidden");
    el("adminError").textContent = "";
    renderAdmin();
  } else {
    el("adminError").textContent = "Code incorrect.";
  }
});

function renderAdmin() {
  el("adminList").innerHTML = slots.map(slot => {
    const regs = regsForSlot(slot.id);

    return `
      <section class="admin-slot">
        <h3>${slot.label} (${regs.length}/${slot.quota})</h3>

        ${regs.length
          ? regs.map(r => `
              <div class="admin-row">
                <span>
                  ${escapeHtml(r.firstName)} ${escapeHtml(r.lastName)}
                  ${r.playerName ? ` – ${escapeHtml(r.playerName)}` : ""}
                </span>
                <button onclick="deleteRegistration('${slot.id}', '${r.id}')">
                  Supprimer
                </button>
              </div>
            `).join("")
          : "<p>Aucune inscription</p>"
        }
      </section>
    `;
  }).join("");

  const reserve = reserveEntries();

  el("adminList").innerHTML += `
    <section class="reserve-admin">
      <h3>Renforts disponibles (${reserve.length})</h3>

      ${reserve.length
        ? reserve.map(r => `
            <div class="reserve-admin-row">
              <strong>
                ${escapeHtml(r.firstName)} ${escapeHtml(r.lastName)}
                ${r.playerName ? ` – ${escapeHtml(r.playerName)}` : ""}
              </strong>
              <small>
                ${Array.isArray(r.slots) ? r.slots.map(slotLabel).join(" • ") : ""}
              </small>
              <button onclick="deleteReserveRegistration('${r.id}')">
                Supprimer
              </button>
            </div>
          `).join("")
        : "<p>Aucune disponibilité enregistrée.</p>"
      }
    </section>
  `;
}

window.deleteReserveRegistration = async function(id) {
  if (!adminUnlocked) return;
  if (!confirm("Supprimer cette disponibilité ?")) return;

  try {
    await db.ref(`barEvents/${EVENT_ID}/reserve/${id}`).remove();
    showToast("Disponibilité supprimée.");
  } catch (error) {
    console.error(error);
    showToast("Suppression impossible.");
  }
};

window.deleteRegistration = async function(slotId, registrationId) {
  if (!adminUnlocked) return;

  if (!confirm("Supprimer cette inscription ?")) return;

  try {
    await db
      .ref(`barEvents/${EVENT_ID}/slots/${slotId}/registrations/${registrationId}`)
      .remove();

    showToast("Inscription supprimée.");
  } catch (error) {
    console.error(error);
    showToast("Suppression impossible.");
  }
};

// Affiche immédiatement les créneaux, même si la base est encore vide.
render();


db.ref(`barEvents/${EVENT_ID}/reserve`).on(
  "value",
  (snapshot) => {
    reserveRegistrations = snapshot.val() || {};
    updateReserveCount();

    if (adminUnlocked) {
      renderAdmin();
    }
  },
  (error) => {
    console.error("Firebase reserve read error:", error);
  }
);

db.ref(`barEvents/${EVENT_ID}/slots`).on(
  "value",
  (snapshot) => {
    const data = snapshot.val() || {};
    registrations = {};

    Object.keys(data).forEach(slotId => {
      registrations[slotId] = data[slotId]?.registrations || {};
    });

    render();
  },
  (error) => {
    console.error("Firebase read error:", error);
    showToast("Connexion Firebase impossible. Vérifiez les règles Realtime Database.");
  }
);
