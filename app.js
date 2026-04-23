// --------- School Portal (HTML/CSS/JS + LocalStorage) ---------
// Grade 10, 3 terms per year, currently Term 2.
// Term grade is made of 5 assessments per subject per term.
// Data stored in LocalStorage.

const STORAGE_KEY = "schoolPortalData_v2";
const SESSION_KEY = "schoolPortalSession_v2";

const CURRENT_GRADE_LEVEL = 10;
const CURRENT_TERM = 2; // 1, 2, 3

const SUBJECTS_DEFAULT = ["Maths", "English", "Science"];

// 5 assessments per term per subject (simple demo structure)
const ASSESSMENTS = [
  { key: "quiz1", label: "Quiz 1", weight: 0.10 },
  { key: "quiz2", label: "Quiz 2", weight: 0.10 },
  { key: "topicTest", label: "Topic Test", weight: 0.30 },
  { key: "coursework", label: "Coursework", weight: 0.20 },
  { key: "endTerm", label: "End-of-Term Test", weight: 0.30 },
];

// Grade boundaries (percent -> letter)
function percentToGrade(pct) {
  if (pct >= 90) return "A*";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "F";
}

// Convert letter grade to a rough percent midpoint (supports +/-)
function gradeToPercentMid(grade) {
  const map = {
    "A*": 95,
    "A+": 90,
    "A": 85,
    "A-": 82,

    "B+": 78,
    "B": 75,
    "B-": 72,

    "C+": 68,
    "C": 65,
    "C-": 62,

    "D+": 58,
    "D": 55,
    "D-": 52,

    "E": 45,
    "F": 30,
  };
  return map[String(grade || "").toUpperCase()] ?? 65;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fmtPct(n) {
  return (Number.isFinite(n)) ? `${n.toFixed(1)}%` : "-";
}

function safeText(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return structuredClone(defaultData);
  }
  return JSON.parse(raw);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireRole(roles) {
  const session = getSession();
  if (!session || !roles.includes(session.role)) {
    window.location.href = "index.html";
  }
  return session;
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}

// Compute weighted percent for term based on available assessments.
// Missing scores are predicted using the average of completed scores.
function computeTerm2PredictedPercent(scoresObj) {
  const entries = ASSESSMENTS.map(a => {
    const v = scoresObj?.[a.key];
    return { ...a, value: (v === "" || v === null || v === undefined) ? null : Number(v) };
  });

  const completed = entries.filter(e => Number.isFinite(e.value));
  const completedCount = completed.length;

  if (completedCount === 0) {
    return { predicted: null, currentAvg: null, completedCount: 0, total: entries.length };
  }

  const avgCompleted = completed.reduce((sum, e) => sum + e.value, 0) / completedCount;

  const filled = entries.map(e => ({
    ...e,
    usedValue: Number.isFinite(e.value) ? e.value : avgCompleted
  }));

  const predicted = filled.reduce((sum, e) => sum + (e.usedValue * e.weight), 0);

  return {
    predicted: clamp(predicted, 0, 100),
    currentAvg: clamp(avgCompleted, 0, 100),
    completedCount,
    total: entries.length
  };
}

// Predict term 3 percent from term1->term2 trend (simple demo logic)
function predictTerm3Percent(term1Grade, term2PredPercent) {
  const term1Pct = gradeToPercentMid(term1Grade);
  const base = Number.isFinite(term2PredPercent) ? term2PredPercent : term1Pct;
  const trend = base - term1Pct;

  // conservative: carry half the trend into term 3
  return clamp(base + trend * 0.5, 0, 100);
}

// Predict year percent: T1 actual + T2 predicted + T3 predicted
function predictYear(term1Grade, term2PredPercent) {
  const t1 = gradeToPercentMid(term1Grade);
  const t2 = Number.isFinite(term2PredPercent) ? term2PredPercent : t1;
  const t3 = predictTerm3Percent(term1Grade, t2);

  // weights: T1 40%, T2 40%, T3 20%
  const yearPct = (t1 * 0.40) + (t2 * 0.40) + (t3 * 0.20);
  return { yearPct: clamp(yearPct, 0, 100), term3Pct: t3 };
}

// Trend label (Term1 midpoint vs Term2 predicted)
function trendLabel(term1Grade, term2PredPct) {
  const t1 = gradeToPercentMid(term1Grade);
  if (!Number.isFinite(term2PredPct)) return "No data yet";
  const diff = term2PredPct - t1;
  if (diff >= 3) return "Improving";
  if (diff <= -3) return "Declining";
  return "Stable";
}

// Default data
const defaultData = {
  meta: {
    gradeLevel: CURRENT_GRADE_LEVEL,
    currentTerm: CURRENT_TERM,
    termsPerYear: 3,
    subjects: SUBJECTS_DEFAULT,
    assessmentModel: ASSESSMENTS,
    teacherEmail: "teacher1@schooldemo.local" // demo email (mailto still works)
  },
  users: [
    { username: "teacher1", password: "Teach#4831", role: "teacher", teacherId: "t1" },

    { username: "amara_s1", password: "Stu#1049", role: "student", studentId: "s1" },
    { username: "jayden_s2", password: "Stu#7720", role: "student", studentId: "s2" },
    { username: "sophia_s3", password: "Stu#5583", role: "student", studentId: "s3" },

    { username: "nadia_p1", password: "Par#9102", role: "parent", parentId: "p1", studentId: "s1" },
    { username: "chinedu_p2", password: "Par#3301", role: "parent", parentId: "p2", studentId: "s2" },
    { username: "imran_p3", password: "Par#7744", role: "parent", parentId: "p3", studentId: "s3" },
  ],
  students: [
    { id: "s1", fullName: "Amara Lewis" },
    { id: "s2", fullName: "Jayden Okoro" },
    { id: "s3", fullName: "Sophia Khan" },
  ],
  // simple extra info for “more details”
  studentStats: {
    s1: { attendancePct: 96, behaviour: "Good", homework: "On track" },
    s2: { attendancePct: 93, behaviour: "Excellent", homework: "On track" },
    s3: { attendancePct: 89, behaviour: "Needs improvement", homework: "Some missing" },
  },
  records: {
    s1: {
      Maths:   { term1Grade: "B",  term2Scores: { quiz1: 72, quiz2: 65, topicTest: 78, coursework: 80, endTerm: null }, studentComment: "Good effort—keep practising algebra.", parentComment: "Support revision twice a week." },
      English: { term1Grade: "A",  term2Scores: { quiz1: 85, quiz2: 88, topicTest: 82, coursework: 90, endTerm: null }, studentComment: "Strong writing. Expand vocabulary.", parentComment: "Encourage reading 15 mins daily." },
      Science: { term1Grade: "B",  term2Scores: { quiz1: 69, quiz2: 70, topicTest: 74, coursework: 75, endTerm: null }, studentComment: "Good curiosity. Revise key terms.", parentComment: "Help plan short weekly recap." },
    },
    s2: {
      Maths:   { term1Grade: "A",  term2Scores: { quiz1: 92, quiz2: 86, topicTest: 88, coursework: 90, endTerm: null }, studentComment: "Excellent pace. Try harder questions.", parentComment: "Keep supporting advanced practice." },
      English: { term1Grade: "B",  term2Scores: { quiz1: 70, quiz2: 68, topicTest: 72, coursework: 74, endTerm: null }, studentComment: "Good progress. Improve accuracy.", parentComment: "Support proofreading homework." },
      Science: { term1Grade: "B+", term2Scores: { quiz1: 78, quiz2: 75, topicTest: 80, coursework: 82, endTerm: null }, studentComment: "Solid understanding. Do past questions.", parentComment: "Encourage weekly practice tests." },
    },
    s3: {
      Maths:   { term1Grade: "C",  term2Scores: { quiz1: 55, quiz2: 60, topicTest: 58, coursework: 62, endTerm: null }, studentComment: "Ask questions and practise basics.", parentComment: "Consider extra support sessions." },
      English: { term1Grade: "B",  term2Scores: { quiz1: 76, quiz2: 79, topicTest: 75, coursework: 80, endTerm: null }, studentComment: "Nice progress. Build vocabulary.", parentComment: "Encourage reading & word games." },
      Science: { term1Grade: "A-", term2Scores: { quiz1: 84, quiz2: 88, topicTest: 86, coursework: 90, endTerm: null }, studentComment: "Great work in experiments!", parentComment: "Support science interest at home." },
    },
  }
};

// ----- Login -----
function handleLoginForm(formId, errorId) {
  const form = document.getElementById(formId);
  const errorEl = document.getElementById(errorId);
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = loadData();

    const username = form.username.value.trim();
    const password = form.password.value;

    const user = data.users.find(u => u.username === username && u.password === password);
    if (!user) {
      errorEl.textContent = "Invalid username or password.";
      return;
    }

    const session = { username: user.username, role: user.role };
    if (user.studentId) session.studentId = user.studentId;
    if (user.parentId) session.parentId = user.parentId;
    if (user.teacherId) session.teacherId = user.teacherId;

    setSession(session);

    if (user.role === "teacher") window.location.href = "teacher.html";
    if (user.role === "student") window.location.href = "student.html";
    if (user.role === "parent")  window.location.href = "parent.html";
  });
}

// ----- Student Dashboard -----
function renderStudentPage() {
  const session = requireRole(["student"]);
  const data = loadData();
  const subjects = data.meta?.subjects ?? SUBJECTS_DEFAULT;

  const student = data.students.find(s => s.id === session.studentId);
  const stats = data.studentStats?.[session.studentId];

  document.getElementById("who").textContent = student?.fullName ?? session.username;
  document.getElementById("role").textContent = "Student";

  document.getElementById("metaLine").textContent =
    `Year ${data.meta.gradeLevel} • Term ${data.meta.currentTerm} of ${data.meta.termsPerYear}`;

  // Top “more details” summary
  document.getElementById("attendance").textContent = stats ? `${stats.attendancePct}%` : "-";
  document.getElementById("behaviour").textContent = stats?.behaviour ?? "-";
  document.getElementById("homework").textContent = stats?.homework ?? "-";

  const records = data.records?.[session.studentId];
  if (!records) {
    document.getElementById("pageError").textContent = "No student record found. Try Reset Demo Data in Teacher page.";
    return;
  }

  // Summary table
  const tbody = document.getElementById("summaryBody");
  tbody.innerHTML = "";

  subjects.forEach(subject => {
    const rec = records[subject];
    if (!rec) return;

    const t2 = computeTerm2PredictedPercent(rec.term2Scores);
    const t2Pred = t2.predicted;
    const t2PredGrade = Number.isFinite(t2Pred) ? percentToGrade(t2Pred) : "-";

    const { yearPct } = predictYear(rec.term1Grade, t2Pred);
    const yearGrade = percentToGrade(yearPct);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${subject}</strong></td>
      <td>${safeText(rec.term1Grade)}</td>
      <td>${t2.completedCount}/${t2.total}</td>
      <td>${t2PredGrade} <small class="muted">(${fmtPct(t2Pred)})</small></td>
      <td>${yearGrade} <small class="muted">(${fmtPct(yearPct)})</small></td>
    `;
    tbody.appendChild(tr);
  });

  // Details cards
  const detailsWrap = document.getElementById("details");
  detailsWrap.innerHTML = "";

  subjects.forEach(subject => {
    const rec = records[subject];
    if (!rec) return;

    const t2 = computeTerm2PredictedPercent(rec.term2Scores);
    const t2Pred = t2.predicted;
    const t2PredGrade = Number.isFinite(t2Pred) ? percentToGrade(t2Pred) : "-";

    const { yearPct, term3Pct } = predictYear(rec.term1Grade, t2Pred);
    const yrGrade = percentToGrade(yearPct);
    const trGrade = percentToGrade(term3Pct);

    const trend = trendLabel(rec.term1Grade, t2Pred);

    const completionPct = t2.total ? (t2.completedCount / t2.total) * 100 : 0;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${subject}</h3>

      <div class="kpi">
        <div class="pill"><strong>Term 1 (Final)</strong><span>${safeText(rec.term1Grade)}</span></div>
        <div class="pill"><strong>Term 2 Current Avg</strong><span>${fmtPct(t2.currentAvg)}</span></div>
        <div class="pill"><strong>Term 2 Predicted</strong><span>${t2PredGrade} (${fmtPct(t2Pred)})</span></div>
        <div class="pill"><strong>Trend</strong><span>${trend}</span></div>
        <div class="pill"><strong>Term 3 Predicted</strong><span>${trGrade} (${fmtPct(term3Pct)})</span></div>
        <div class="pill"><strong>End of Year Predicted</strong><span>${yrGrade} (${fmtPct(yearPct)})</span></div>
      </div>

      <div class="progress-wrap" style="margin-top:12px;">
        <small class="muted">Term 2 completion: ${t2.completedCount}/${t2.total}</small>
        <div class="progress-bar"><div style="width:${completionPct.toFixed(0)}%"></div></div>
      </div>

      <hr/>

      <strong>Term 2 Assessments</strong>
      <table>
        <thead>
          <tr>
            <th>Assessment</th>
            <th>Weight</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${ASSESSMENTS.map(a => {
            const v = rec.term2Scores?.[a.key];
            const show = Number.isFinite(Number(v)) ? Number(v) : "-";
            return `
              <tr>
                <td>${a.label}</td>
                <td>${Math.round(a.weight*100)}%</td>
                <td>${show}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <hr/>

      <strong>Teacher comment (for you)</strong>
      <p>${safeText(rec.studentComment)}</p>

      <p><strong>Parent-only comment:</strong> <small class="muted">(hidden from student)</small></p>
    `;
    detailsWrap.appendChild(card);
  });
}

// ----- Parent Dashboard + Email teacher -----
function renderParentPage() {
  const session = requireRole(["parent"]);
  const data = loadData();
  const subjects = data.meta?.subjects ?? SUBJECTS_DEFAULT;

  document.getElementById("metaLine").textContent =
    `Year ${data.meta.gradeLevel} • Term ${data.meta.currentTerm} of ${data.meta.termsPerYear}`;

  const user = data.users.find(u => u.username === session.username);
  const studentId = user?.studentId;

  const student = data.students.find(s => s.id === studentId);
  const stats = data.studentStats?.[studentId];

  document.getElementById("who").textContent = `Parent: ${session.username}`;
  document.getElementById("role").textContent = "Parent";
  document.getElementById("childName").textContent = student?.fullName ?? "-";

  document.getElementById("attendance").textContent = stats ? `${stats.attendancePct}%` : "-";
  document.getElementById("behaviour").textContent = stats?.behaviour ?? "-";
  document.getElementById("homework").textContent = stats?.homework ?? "-";

  const records = data.records?.[studentId];
  if (!records) {
    document.getElementById("pageError").textContent = "No child record found. Try Reset Demo Data in Teacher page.";
    return;
  }

  // Summary table
  const tbody = document.getElementById("summaryBody");
  tbody.innerHTML = "";

  // Build a text summary for email
  let emailLines = [];
  emailLines.push(`Child: ${student?.fullName ?? "Unknown"}`);
  emailLines.push(`Grade ${data.meta.gradeLevel} - Term ${data.meta.currentTerm}`);
  emailLines.push("");

  subjects.forEach(subject => {
    const rec = records[subject];
    if (!rec) return;

    const t2 = computeTerm2PredictedPercent(rec.term2Scores);
    const t2Pred = t2.predicted;
    const t2PredGrade = Number.isFinite(t2Pred) ? percentToGrade(t2Pred) : "-";

    const { yearPct } = predictYear(rec.term1Grade, t2Pred);
    const yearGrade = percentToGrade(yearPct);

    emailLines.push(`${subject}: T1 ${rec.term1Grade} | T2 Pred ${t2PredGrade} (${fmtPct(t2Pred)}) | Year Pred ${yearGrade} (${fmtPct(yearPct)})`);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${subject}</strong></td>
      <td>${safeText(rec.term1Grade)}</td>
      <td>${t2.completedCount}/${t2.total}</td>
      <td>${t2PredGrade} <small class="muted">(${fmtPct(t2Pred)})</small></td>
      <td>${yearGrade} <small class="muted">(${fmtPct(yearPct)})</small></td>
    `;
    tbody.appendChild(tr);
  });

  // Setup mailto button
  const teacherEmail = data.meta?.teacherEmail || "teacher1@schooldemo.local";
  const subject = encodeURIComponent(`Progress update – ${student?.fullName ?? "Student"} (Grade ${data.meta.gradeLevel})`);
  const body = encodeURIComponent(
    `Hello Teacher,\n\nI would like to discuss my child’s progress.\n\n${emailLines.join("\n")}\n\nQuestions:\n- \n\nThank you,\n${session.username}`
  );

  const mailBtn = document.getElementById("emailTeacherBtn");
  mailBtn.href = `mailto:${teacherEmail}?subject=${subject}&body=${body}`;

  // Details cards (including parent-only comment)
  const detailsWrap = document.getElementById("details");
  detailsWrap.innerHTML = "";

  subjects.forEach(subject => {
    const rec = records[subject];
    if (!rec) return;

    const t2 = computeTerm2PredictedPercent(rec.term2Scores);
    const t2Pred = t2.predicted;

    const { yearPct, term3Pct } = predictYear(rec.term1Grade, t2Pred);

    const completionPct = t2.total ? (t2.completedCount / t2.total) * 100 : 0;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${subject}</h3>

      <div class="kpi">
        <div class="pill"><strong>Term 1 (Final)</strong><span>${safeText(rec.term1Grade)}</span></div>
        <div class="pill"><strong>Term 2 Current Avg</strong><span>${fmtPct(t2.currentAvg)}</span></div>
        <div class="pill"><strong>Term 2 Predicted</strong><span>${percentToGrade(Number.isFinite(t2Pred) ? t2Pred : gradeToPercentMid(rec.term1Grade))} (${fmtPct(t2Pred)})</span></div>
        <div class="pill"><strong>Term 3 Predicted</strong><span>${percentToGrade(term3Pct)} (${fmtPct(term3Pct)})</span></div>
        <div class="pill"><strong>End of Year Predicted</strong><span>${percentToGrade(yearPct)} (${fmtPct(yearPct)})</span></div>
      </div>

      <div class="progress-wrap" style="margin-top:12px;">
        <small class="muted">Term 2 completion: ${t2.completedCount}/${t2.total}</small>
        <div class="progress-bar"><div style="width:${completionPct.toFixed(0)}%"></div></div>
      </div>

      <hr/>

      <strong>Teacher comments</strong>
      <p><strong>For student:</strong> ${safeText(rec.studentComment)}</p>
      <p><strong>For parent only:</strong> ${safeText(rec.parentComment)}</p>
    `;
    detailsWrap.appendChild(card);
  });
}

// ----- Teacher page (kept compatible with your current teacher.html) -----
function renderTeacherPage() {
  const session = requireRole(["teacher"]);
  let data = loadData();
  const subjects = data.meta?.subjects ?? SUBJECTS_DEFAULT;

  document.getElementById("who").textContent = session.username;
  document.getElementById("role").textContent = "Teacher";
  const metaLine = document.getElementById("metaLine");
  if (metaLine) {
    metaLine.textContent = `Year ${data.meta.gradeLevel} • Term ${data.meta.currentTerm} of ${data.meta.termsPerYear}`;
  }

  const studentSelect = document.getElementById("studentSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const statusEl = document.getElementById("status");

  studentSelect.innerHTML = "";
  data.students.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.fullName;
    studentSelect.appendChild(opt);
  });

  subjectSelect.innerHTML = "";
  subjects.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = sub;
    subjectSelect.appendChild(opt);
  });

  const term1GradeSelect = document.getElementById("term1GradeSelect");
  const gradeOptions = ["A*", "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E", "F"];
  term1GradeSelect.innerHTML = gradeOptions.map(g => `<option value="${g}">${g}</option>`).join("");

  const assessmentInputsWrap = document.getElementById("assessmentInputs");
  assessmentInputsWrap.innerHTML = ASSESSMENTS.map(a => `
    <div>
      <label>${a.label} <small class="muted">(${Math.round(a.weight*100)}%)</small></label>
      <input type="number" min="0" max="100" step="1" id="score_${a.key}" placeholder="0-100 (leave blank if not done)" />
    </div>
  `).join("");

  function getCurrentRecord() {
    const sid = studentSelect.value;
    const sub = subjectSelect.value;
    return { sid, sub, rec: data.records[sid][sub] };
  }

  function updatePreview() {
    const { sid, sub } = getCurrentRecord();

    const tempTerm1 = term1GradeSelect.value;
    const tempScores = {};
    ASSESSMENTS.forEach(a => {
      const v = document.getElementById(`score_${a.key}`).value;
      tempScores[a.key] = (v === "" ? null : Number(v));
    });

    const t2 = computeTerm2PredictedPercent(tempScores);
    const { yearPct, term3Pct } = predictYear(tempTerm1, t2.predicted);

    const studentName = data.students.find(s => s.id === sid)?.fullName ?? "";
    const badge = document.getElementById("editingBadge");
    if (badge) badge.textContent = `${studentName} • ${sub}`;

    const p2 = document.getElementById("previewTerm2");
    const p3 = document.getElementById("previewTerm3");
    const py = document.getElementById("previewYear");

    if (p2) p2.textContent = `Predicted end of Term 2: ${Number.isFinite(t2.predicted) ? percentToGrade(t2.predicted) : "-"} (${fmtPct(t2.predicted)}) • Completion ${t2.completedCount}/${t2.total}`;
    if (p3) p3.textContent = `Predicted Term 3: ${percentToGrade(term3Pct)} (${fmtPct(term3Pct)})`;
    if (py) py.textContent = `Predicted end of Year: ${percentToGrade(yearPct)} (${fmtPct(yearPct)})`;

    const bar = document.getElementById("completionBar");
    const label = document.getElementById("completionLabel");
    const pct = t2.total ? (t2.completedCount / t2.total) * 100 : 0;
    if (bar) bar.style.width = `${pct.toFixed(0)}%`;
    if (label) label.textContent = `Term 2 completion: ${t2.completedCount}/${t2.total}`;
  }

  function loadIntoForm() {
    data = loadData();
    const { rec } = getCurrentRecord();

    term1GradeSelect.value = rec.term1Grade;

    ASSESSMENTS.forEach(a => {
      const input = document.getElementById(`score_${a.key}`);
      const v = rec.term2Scores?.[a.key];
      input.value = Number.isFinite(Number(v)) ? Number(v) : "";
    });

    document.getElementById("studentCommentInput").value = rec.studentComment ?? "";
    document.getElementById("parentCommentInput").value = rec.parentComment ?? "";

    if (statusEl) {
      statusEl.textContent = "";
      statusEl.className = "";
    }
    updatePreview();
  }

  studentSelect.addEventListener("change", loadIntoForm);
  subjectSelect.addEventListener("change", loadIntoForm);

  term1GradeSelect.addEventListener("change", updatePreview);
  ASSESSMENTS.forEach(a => {
    document.getElementById(`score_${a.key}`).addEventListener("input", updatePreview);
  });

  loadIntoForm();

  const form = document.getElementById("teacherForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const latest = loadData();
    const sid = studentSelect.value;
    const sub = subjectSelect.value;

    const updatedScores = {};
    ASSESSMENTS.forEach(a => {
      const v = document.getElementById(`score_${a.key}`).value;
      updatedScores[a.key] = (v === "" ? null : Number(v));
    });

    latest.records[sid][sub].term1Grade = term1GradeSelect.value;
    latest.records[sid][sub].term2Scores = updatedScores;
    latest.records[sid][sub].studentComment = document.getElementById("studentCommentInput").value.trim();
    latest.records[sid][sub].parentComment = document.getElementById("parentCommentInput").value.trim();

    saveData(latest);
    data = latest;

    if (statusEl) {
      statusEl.className = "success";
      statusEl.textContent = "Saved! Student and Parent dashboards will reflect this immediately.";
    }
    updatePreview();
  });

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      if (statusEl) {
        statusEl.className = "success";
        statusEl.textContent = "Demo data reset.";
      }
      window.location.reload();
    });
  }
}

window.schoolPortal = {
  logout,
  handleLoginForm,
  renderStudentPage,
  renderParentPage,
  renderTeacherPage,
};
