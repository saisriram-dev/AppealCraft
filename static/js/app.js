/* ─────────────────────────────────────────────
   AppealCraft · app.js  (refined)
   Form logic · AI generation · PDF export
───────────────────────────────────────────── */

/* ── STATE ── */
let uploadedFiles = [];
let generatedLetter = "";
let generatedSteps = [];

/* ── DOM REFS ── */
const form = document.getElementById("dispute-form");
const companyInput = document.getElementById("company");
const companyPreset = document.getElementById("company-preset");
const complaintTA = document.getElementById("complaint");
const charCount = document.getElementById("char-count");
const uploadZone = document.getElementById("upload-zone");
const fileInput = document.getElementById("file-input");
const fileListEl = document.getElementById("file-list");
const submitBtn = document.getElementById("submit-btn");

const panelInput = document.getElementById("panel-input");
const panelOutput = document.getElementById("panel-output");
const genState = document.getElementById("generating-state");
const genSub = document.getElementById("generating-sub");
const resultState = document.getElementById("result-state");
const errorState = document.getElementById("error-state");
const letterBody = document.getElementById("letter-body");
const stepsList = document.getElementById("steps-list");
const resultCompany = document.getElementById("result-company");
const resultType = document.getElementById("result-type");

/* ── COMPANY PRESET SYNC ── */
function syncCompany(select) {
  if (select.value) {
    companyInput.value = select.value;
    companyInput.dispatchEvent(new Event("input"));
    // Clear error if present
    companyInput.closest(".field-group").classList.remove("has-error");
  }
}

/* ── CHAR COUNTER ── */
complaintTA.addEventListener("input", () => {
  const len = complaintTA.value.length;
  charCount.textContent = `${len.toLocaleString()} / 2,000`;
  if (len > 2000) complaintTA.value = complaintTA.value.slice(0, 2000);
  // Clear error once typing
  if (len >= 20) {
    complaintTA.closest(".field-group").classList.remove("has-error");
  }
});

/* Clear company error on type */
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
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) {
    // Scroll to first error
    const firstError = form.querySelector(".has-error");
    if (firstError)
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  await runGeneration();
});

/* ── GENERATING MESSAGES ── */
const GENERATING_MESSAGES = [
  "Analyzing your dispute…",
  "Identifying applicable laws and policies…",
  "Drafting your demand letter…",
  "Building your escalation roadmap…",
  "Finalizing your letter…",
];

// Simulated progress percentages per message index
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

/* ── READ FILES AS BASE64 ── */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/* ── BUILD PROMPT ── */
function buildPrompt({ company, disputeType, complaint, amount, tone }) {
  const toneInstructions = {
    firm: "The tone should be firm, professional, and assertive — clearly demanding resolution without being aggressive.",
    urgent:
      "The tone should be urgent and demanding. Emphasize time-sensitivity and the consequences of inaction.",
    formal:
      "The tone should be strictly formal and legal in nature. Use precise legal language and reference regulatory statutes where applicable.",
  };

  return `You are an expert consumer rights advocate and legal letter drafter. A consumer needs your help.

DISPUTE DETAILS:
- Company: ${company}
- Type of dispute: ${disputeType || "Consumer dispute"}
- Amount claimed: ${amount ? `$${amount}` : "Not specified"}
- Tone requested: ${tone}
- Consumer's account: ${complaint}

TASK: Write a powerful, legally authoritative demand letter on behalf of this consumer.

LETTER REQUIREMENTS:
1. Open with today's date (${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}) and proper addressing (use "[Company Name] Customer Relations Department" since we don't have a specific name)
2. State the dispute clearly in the first paragraph with specific details from the consumer's account
3. Reference relevant consumer protection laws, regulations, or the company's own stated policies (e.g., DOT 14 CFR 250 for airlines, FCBA for billing disputes, state insurance regulations, etc.) — be specific and accurate
4. Make a clear, specific demand (refund amount, specific action, timeline — demand response within 14 business days)
5. State consequences if the demand is not met (regulatory complaint, small claims court, credit card dispute, consumer protection bureau)
6. Close professionally
7. ${toneInstructions[tone] || toneInstructions.firm}
8. The letter should be 4-6 paragraphs, polished, and ready to send as-is

After the letter, provide a JSON block for the escalation roadmap in this EXACT format (no markdown, just raw JSON after "---STEPS---"):

---STEPS---
[
  {
    "title": "Short action title",
    "desc": "Specific actionable description with details",
    "link": "https://... (optional relevant URL, or empty string)"
  },
  ...
]

Include 4-6 concrete next steps specific to this type of dispute (e.g. exact regulatory agency URLs, specific email formats, small claims court threshold info for the dispute amount, etc.).

Write the letter first, then the steps block. Do not add any commentary before or after.`;
}

/* ── PARSE AI RESPONSE ── */
function parseResponse(raw) {
  const parts = raw.split("---STEPS---");
  const letter = parts[0].trim();
  let steps = [];

  if (parts[1]) {
    try {
      const clean = parts[1]
        .trim()
        .replace(/```json|```/g, "")
        .trim();
      steps = JSON.parse(clean);
    } catch (_) {
      steps = [];
    }
  }

  return { letter, steps };
}

/* ── RENDER OUTPUT ── */
function renderOutput(company, disputeType, letter, steps) {
  generatedLetter = letter;
  generatedSteps = steps;

  resultCompany.textContent = company;
  resultType.textContent = disputeType || "Consumer dispute";
  letterBody.textContent = letter;

  stepsList.innerHTML = "";
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.className = "step-item";
    li.innerHTML = `
      <span class="step-num-badge" aria-hidden="true">${i + 1}</span>
      <div class="step-item-content">
        <div class="step-item-title">${escHtml(step.title)}</div>
        <div class="step-item-desc">${escHtml(step.desc)}</div>
        ${
          step.link
            ? `<a class="step-item-link" href="${escHtml(step.link)}" target="_blank" rel="noopener noreferrer">
               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
               ${escHtml(step.link)}
             </a>`
            : ""
        }
      </div>
    `;
    stepsList.appendChild(li);
  });
}

/* ── MAIN GENERATION FLOW ── */
async function runGeneration() {
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

  try {
    const content = [];

    /* Attach files if any */
    for (const file of uploadedFiles) {
      const b64 = await fileToBase64(file);
      const mediaType = file.type;

      if (mediaType === "application/pdf") {
        content.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: b64 },
        });
      } else {
        content.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: b64 },
        });
      }
    }

    content.push({
      type: "text",
      text: buildPrompt({ company, disputeType, complaint, amount, tone }),
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1800,
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const { letter, steps } = parseResponse(rawText);

    clearInterval(msgInterval);
    renderOutput(company, disputeType, letter, steps);

    genState.style.display = "none";
    resultState.style.display = "block";
    resultState.style.animation = "none";
    void resultState.offsetWidth; // reflow
    resultState.style.animation = "";
  } catch (err) {
    clearInterval(msgInterval);
    genState.style.display = "none";
    errorState.style.display = "flex";
    document.getElementById("error-message").textContent =
      err.message || "Something went wrong. Please try again.";
    console.error("AppealCraft error:", err);
  }
}

/* ── COPY LETTER ── */
function copyLetter() {
  if (!generatedLetter) return;
  navigator.clipboard
    .writeText(generatedLetter)
    .then(() => {
      const btn = document.getElementById("copy-letter-btn");
      const btnText = btn.querySelector(".copy-btn-text");
      btn.classList.add("copied");
      if (btnText) btnText.textContent = "✓ Copied!";

      setTimeout(() => {
        btn.classList.remove("copied");
        if (btnText) btnText.textContent = "Copy";
      }, 2200);
    })
    .catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = generatedLetter;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
      } catch (_) {}
      document.body.removeChild(ta);
    });
}

/* ── PDF DOWNLOAD ── */
function downloadPDF() {
  if (!generatedLetter) return;

  const company = resultCompany.textContent || "Company";
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const stepsHTML = generatedSteps
    .map(
      (s, i) => `
    <div style="display:flex;gap:14px;margin-bottom:18px;align-items:flex-start">
      <div style="min-width:24px;height:24px;background:#141210;color:#faf8f4;border-radius:50%;
                  display:flex;align-items:center;justify-content:center;
                  font-size:11px;font-weight:600;flex-shrink:0;">${i + 1}</div>
      <div>
        <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:#141210;">${escHtml(s.title)}</div>
        <div style="font-size:12px;color:#7a7268;line-height:1.6;">${escHtml(s.desc)}</div>
        ${s.link ? `<div style="font-size:11px;color:#b5271f;margin-top:4px;">${escHtml(s.link)}</div>` : ""}
      </div>
    </div>
  `,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Demand Letter — ${escHtml(company)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Outfit', system-ui, sans-serif;
    max-width: 700px;
    margin: 48px auto;
    color: #141210;
    background: #faf8f4;
    padding: 0 24px 64px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 36px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e6e1d9;
  }
  .doc-brand {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 18px;
    font-weight: 600;
    color: #141210;
  }
  .doc-brand span { color: #b5271f; }
  .doc-date { font-size: 11px; color: #7a7268; }
  .doc-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .doc-meta { font-size: 12px; color: #7a7268; margin-bottom: 32px; }
  .letter {
    white-space: pre-wrap;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 15px;
    line-height: 1.9;
    background: #ffffff;
    border: 1px solid #e6e1d9;
    border-radius: 8px;
    padding: 32px 36px;
    margin-bottom: 40px;
    color: #141210;
  }
  .section-heading {
    font-family: 'Outfit', sans-serif;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #b0a89e;
    margin-bottom: 20px;
  }
  .footer {
    font-size: 10px;
    color: #b0a89e;
    text-align: center;
    margin-top: 52px;
    padding-top: 18px;
    border-top: 1px solid #e6e1d9;
  }
  @media print {
    body { margin: 0; background: white; }
    .letter { border: 1px solid #ddd; }
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-brand">Appeal<span>Craft</span></div>
    <div class="doc-date">Generated ${dateStr}</div>
  </div>
  <div class="doc-title">Demand Letter — ${escHtml(company)}</div>
  <div class="doc-meta">Prepared by AppealCraft</div>
  <div class="letter">${escHtml(generatedLetter)}</div>
  <div class="section-heading">Escalation Roadmap</div>
  ${stepsHTML}
  <div class="footer">AppealCraft · appealcraft.com · ${dateStr}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `demand-letter-${company.toLowerCase().replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
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
