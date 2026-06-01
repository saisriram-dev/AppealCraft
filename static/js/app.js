/* ─────────────────────────────────────────────
   AppealCraft · app.js
   Form logic · UI only — backend POST is yours
───────────────────────────────────────────── */

/* ── STATE ── */
let uploadedFiles = [];

/* ── DOM REFS ── */
const form = document.getElementById("dispute-form");
const companyInput = document.getElementById("company"); // Text input for company name
const companyPreset = document.getElementById("company-preset"); // Dropdown select for company presets
const complaintTA = document.getElementById("complaint"); // Textarea for complaint description
const charCount = document.getElementById("char-count");
const uploadZone = document.getElementById("upload-zone");
const fileInput = document.getElementById("file-input");
const fileListEl = document.getElementById("file-list");
const submitBtn = document.getElementById("submit-btn");

// Dispute type elements
const chips = document.querySelectorAll(".chip");
const hiddenInput = document.getElementById("dispute-type"); // Hidden input to store selected dispute type

const panelInput = document.getElementById("panel-input");
const panelOutput = document.getElementById("panel-output");
const genState = document.getElementById("generating-state");
const genSub = document.getElementById("generating-sub");
const resultState = document.getElementById("result-state");
const errorState = document.getElementById("error-state");
const resultCompany = document.getElementById("result-company");
const resultType = document.getElementById("result-type");

/* ── COMPANY PRESET SYNC ── */
function syncCompany(select) {
  if (select.value) {
    companyInput.value = select.value;
    companyInput.dispatchEvent(new Event("input"));
    companyInput.closest(".field-group").classList.remove("has-error");
  }
}

/* ── CHAR COUNTER ── */
complaintTA.addEventListener("input", () => {
  const len = complaintTA.value.length;
  charCount.textContent = `${len.toLocaleString()} / 2,000`;
  if (len > 2000) complaintTA.value = complaintTA.value.slice(0, 2000);
  if (len >= 20) {
    complaintTA.closest(".field-group").classList.remove("has-error");
  }
});

/* ── CLEAR COMPANY ERROR ON TYPE ── */
companyInput.addEventListener("input", () => {
  if (companyInput.value.trim()) {
    companyInput.closest(".field-group").classList.remove("has-error");
  }
});

/* ── DISPUTE TYPE CHIPS ── */
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
    document.getElementById("dispute-type").value = chip.dataset.value;
  });
});

/* ── FILE UPLOAD ── */
uploadZone.addEventListener("click", () => fileInput.click());

uploadZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});
uploadZone.addEventListener("dragleave", (e) => {
  if (!uploadZone.contains(e.relatedTarget)) {
    uploadZone.classList.remove("dragover");
  }
});
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  addFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener("change", () => {
  addFiles([...fileInput.files]);
  fileInput.value = "";
});

function addFiles(newFiles) {
  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  newFiles.forEach((f) => {
    if (!allowed.includes(f.type)) return;
    if (f.size > 10 * 1024 * 1024) return;
    if (uploadedFiles.some((u) => u.name === f.name && u.size === f.size))
      return;
    uploadedFiles.push(f);
  });
  renderFileList();
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderFileList();
}

function renderFileList() {
  fileListEl.innerHTML = "";
  uploadedFiles.forEach((f, i) => {
    const ext = f.name.split(".").pop().toUpperCase();
    const size =
      f.size < 1024 * 1024
        ? `${Math.round(f.size / 1024)} KB`
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;

    const item = document.createElement("div");
    item.className = "file-item";
    item.setAttribute("role", "listitem");
    item.innerHTML = `
      <span class="file-icon" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </span>
      <span class="file-name" title="${escHtml(f.name)}">${escHtml(f.name)}</span>
      <span class="file-size">${ext} · ${size}</span>
      <button class="file-remove" onclick="removeFile(${i})" aria-label="Remove ${escHtml(f.name)}">×</button>
    `;
    fileListEl.appendChild(item);
  });
}

/* ── FORM VALIDATION ── */
function validateForm() {
  let valid = true;

  const companyGroup = companyInput.closest(".field-group");
  if (!companyInput.value.trim()) {
    companyGroup.classList.add("has-error");
    valid = false;
  } else {
    companyGroup.classList.remove("has-error");
  }

  const complaintGroup = complaintTA.closest(".field-group");
  if (!complaintTA.value.trim() || complaintTA.value.trim().length < 20) {
    complaintGroup.classList.add("has-error");
    document.getElementById("complaint-error").textContent =
      complaintTA.value.trim().length === 0
        ? "Please describe what happened."
        : "Please provide a bit more detail (at least 20 characters).";
    valid = false;
  } else {
    complaintGroup.classList.remove("has-error");
  }

  return valid;
}

/* ── FORM SUBMIT ── */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateForm()) {
    const firstError = form.querySelector(".has-error");
    if (firstError)
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  submitToBackend();
});

/* ── GENERATING MESSAGES ── */
const GENERATING_MESSAGES = [
  "Analyzing your dispute…",
  "Identifying applicable laws and policies…",
  "Building your escalation roadmap…",
  "Finding relevant agencies and resources…",
  "Finalizing your steps…",
];

const PROGRESS_VALUES = [15, 35, 58, 78, 92];

function cycleMessages() {
  let i = 0;
  const progressBar = document.getElementById("gen-progress-bar");

  function update() {
    genSub.style.opacity = "0";
    setTimeout(() => {
      genSub.textContent = GENERATING_MESSAGES[i];
      genSub.style.opacity = "1";
      if (progressBar) progressBar.style.animationPlayState = "running";
    }, 200);
    i = (i + 1) % GENERATING_MESSAGES.length;
  }

  update();
  return setInterval(update, 2400);
}

/* ── SHOW / HIDE PANELS ── */
function showOutputPanel() {
  panelInput.classList.remove("active");
  panelOutput.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const step1 = document.querySelector('.nav-step[data-step="1"]');
  const step2 = document.querySelector('.nav-step[data-step="2"]');
  const trackFill = document.getElementById("nav-track-fill");

  if (step1) {
    step1.classList.remove("active");
    step1.classList.add("done");
  }
  if (step2) {
    step2.classList.add("active");
  }
  if (trackFill) trackFill.style.width = "100%";
}

function goBack() {
  panelOutput.classList.remove("active");
  panelInput.classList.add("active");
  genState.style.display = "flex";
  resultState.style.display = "none";
  errorState.style.display = "none";

  const step1 = document.querySelector('.nav-step[data-step="1"]');
  const step2 = document.querySelector('.nav-step[data-step="2"]');
  const trackFill = document.getElementById("nav-track-fill");

  if (step1) {
    step1.classList.add("active");
    step1.classList.remove("done");
  }
  if (step2) {
    step2.classList.remove("active");
  }
  if (trackFill) trackFill.style.width = "0%";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ── GENERATION FLOW ── */
function runGeneration() {
  showOutputPanel();
  genState.style.display = "flex";
  resultState.style.display = "none";
  errorState.style.display = "none";

  const msgInterval = cycleMessages();

  const company = companyInput.value.trim();
  const disputeType = document.getElementById("dispute-type").value;
  const complaint = complaintTA.value.trim();
  const amount = document.getElementById("amount").value;
  const tone = document.getElementById("tone").value;

  return {
    company,
    disputeType,
    complaint,
    amount,
    tone,
  };
}

function showResult(company, disputeType, msgInterval) {
  clearInterval(msgInterval);
  resultCompany.textContent = company;
  resultType.textContent = disputeType || "Consumer dispute";
  genState.style.display = "none";
  resultState.style.display = "block";
  resultState.style.animation = "none";
  void resultState.offsetWidth;
  resultState.style.animation = "";
}

function showError(message, msgInterval) {
  clearInterval(msgInterval);
  genState.style.display = "none";
  errorState.style.display = "flex";
  document.getElementById("error-message").textContent =
    message || "Something went wrong. Please try again.";
}

/* ── BACKEND POST ── */
async function problem_details() {
  const { company, disputeType, complaint, amount, tone } = runGeneration();

  submitBtn.addEventListener("click", async (e) => {
    // Prevent default form submission behavior
    e.preventDefault();

    // Disable the button to prevent multiple clicks
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append("company", company);
    formData.append("disputeType", disputeType);
    formData.append("complaint", complaint);
    formData.append("amount", amount);
    formData.append("tone", tone);

    const files = fileInput.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
    }

    try {
      const response = await fetch("", {
        method: "POST",
        body: formData,
      });

      data = await response.json();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  });
}

/* ── UTILS ── */
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
