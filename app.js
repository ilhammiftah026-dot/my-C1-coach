// =====================
// My C1 Coach - app.js
// =====================

const STORAGE_KEY = "my_c1_coach_v1";

const DEFAULT_STATE = {
  settings: {
    targetDate: "",
    dailyTime: 30,
    links: {
      link1: "",
      link2: "",
      link3: ""
    }
  },
  test: {
    startedAt: null,
    readingAnswers: {},   // qid -> "A|B|C|D"
    grammarAnswers: {},   // qid -> "A|B|C|D"
    writingText: "",
    writingChecks: { structure:false, connectors:false, precision:false, grammar:false },
    speakingChecks: { fluency:false, structure:false, pron:false, range:false }
  },
  results: null, // computed
  plan: null
};

const BANK = {
  reading: [
    { id:"R1", q:"Dans « Bien que le projet soit ambitieux, il reste réalisable », « bien que » exprime :", choices:["La cause","La concession","La conséquence","Le but"], correct:"B" },
    { id:"R2", q:"« Il n’en demeure pas moins que… » signifie :", choices:["Il est certain que…","Cependant…","C’est pourquoi…","Par conséquent…"], correct:"B" },
    { id:"R3", q:"« À défaut de preuves, il est difficile de trancher. » À défaut de = ", choices:["Grâce à","En l’absence de","En plus de","À cause de"], correct:"B" },
    { id:"R4", q:"« Cette mesure, censée aider les étudiants, a eu l’effet inverse. » « censée » veut dire :", choices:["Obligée","Supposée","Interdite","Ravie"], correct:"B" },
    { id:"R5", q:"« On ne peut exclure l’hypothèse que… » signifie :", choices:["On est sûr que…","On refuse que…","Il est possible que…","Il est faux que…"], correct:"C" },
    { id:"R6", q:"« Ce texte met en lumière… » veut dire :", choices:["Cache","Explique clairement","Critique uniquement","Ignore"], correct:"B" },
    { id:"R7", q:"« D’emblée, le lecteur comprend… » D’emblée = ", choices:["Tout de suite","À la fin","Avec difficulté","Par hasard"], correct:"A" },
    { id:"R8", q:"« Autant dire que la situation est délicate. » Autant dire que = ", choices:["Il est inutile de dire que","On peut dire que","On ne doit pas dire que","On dit le contraire"], correct:"B" },
    { id:"R9", q:"« Il s’agit moins de convaincre que de faire réfléchir. » Le sens global :", choices:["Convaincre est prioritaire","Faire réfléchir est plus important","Les deux sont identiques","Aucun des deux"], correct:"B" },
    { id:"R10", q:"« À l’instar de plusieurs pays… » À l’instar de = ", choices:["Contrairement à","Comme","À cause de","Malgré"], correct:"B" }
  ],
  grammar: [
    { id:"G1", q:"Choisis la forme correcte : « Il faut que tu ___ plus tôt. »", choices:["viens","vient","venir","viendrais"], correct:"A" },
    { id:"G2", q:"« C’est la meilleure solution ___ j’aie trouvée. »", choices:["que","dont","où","ce que"], correct:"A" },
    { id:"G3", q:"Accord : « Les mesures qu’il a ___ en place »", choices:["mis","mise","mises","mettre"], correct:"A" },
    { id:"G4", q:"Registre : remplace « très important » par plus soutenu :", choices:["super important","capital","grave","énorme"], correct:"B" },
    { id:"G5", q:"Connecteur logique : opposition nuancée :", choices:["en effet","cependant","donc","ainsi"], correct:"B" },
    { id:"G6", q:"« Si j’avais su, je ___ venu. »", choices:["serais","aurais","ai","vais"], correct:"B" },
    { id:"G7", q:"Pronom : « La décision ? Je m’y suis ___ »", choices:["opposé","opposée","opposés","opposées"], correct:"A" },
    { id:"G8", q:"Style : reformule « je pense que » plus C1 :", choices:["je crois que","il me semble que","je dis que","je sais que"], correct:"B" },
    { id:"G9", q:"Subjonctif : « Bien qu’il ___ tard, il continue. »", choices:["est","soit","sera","était"], correct:"B" },
    { id:"G10", q:"Lexique : « réduire » (synonyme soutenu) :", choices:["baisser","diminuer","rabaisser","couper"], correct:"B" }
  ]
};

// ---------- helpers ----------
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return structuredClone(DEFAULT_STATE);
  try { return Object.assign(structuredClone(DEFAULT_STATE), JSON.parse(raw)); }
  catch { return structuredClone(DEFAULT_STATE); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function $(id){ return document.getElementById(id); }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

// ---------- app state ----------
let state = loadState();

// ---------- tabs ----------
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

function openTab(tabId){
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
  panels.forEach(p => p.classList.toggle("show", p.id === tabId));
}

tabs.forEach(btn => btn.addEventListener("click", () => openTab(btn.dataset.tab)));

$("goTest").addEventListener("click", () => openTab("test"));
$("goDaily").addEventListener("click", () => { openTab("daily"); renderDaily(null); });

$("resetAll").addEventListener("click", () => {
  state = structuredClone(DEFAULT_STATE);
  saveState();
  renderAll();
  openTab("home");
});

// ---------- render questions ----------
function renderQuestions(blockEl, items, answerStoreKey){
  blockEl.innerHTML = "";
  items.forEach((it, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "q";
    wrap.innerHTML = `
      <div class="qt">${idx+1}. ${it.q}</div>
      <div class="choices">
        ${["A","B","C","D"].map((letter,i)=>`
          <label>
            <input type="radio" name="${it.id}" value="${letter}">
            <span><b>${letter}.</b> ${it.choices[i]}</span>
          </label>
        `).join("")}
      </div>
    `;
    blockEl.appendChild(wrap);

    // restore saved answer
    const saved = state.test[answerStoreKey][it.id];
    if(saved){
      const input = wrap.querySelector(`input[value="${saved}"]`);
      if(input) input.checked = true;
    }

    // save on change
    wrap.querySelectorAll("input[type=radio]").forEach(r => {
      r.addEventListener("change", () => {
        state.test[answerStoreKey][it.id] = r.value;
        saveState();
      });
    });
  });
}

function syncWritingSpeaking(){
  $("writingText").value = state.test.writingText || "";
  $("writingText").addEventListener("input", () => {
    state.test.writingText = $("writingText").value;
    saveState();
  });

  const wMap = {
    w_structure:"structure", w_connectors:"connectors", w_precision:"precision", w_grammar:"grammar"
  };
  Object.entries(wMap).forEach(([id,key]) => {
    const el = $(id);
    el.checked = !!state.test.writingChecks[key];
    el.addEventListener("change", () => {
      state.test.writingChecks[key] = el.checked;
      saveState();
    });
  });

  const sMap = {
    s_fluency:"fluency", s_structure:"structure", s_pron:"pron", s_range:"range"
  };
  Object.entries(sMap).forEach(([id,key]) => {
    const el = $(id);
    el.checked = !!state.test.speakingChecks[key];
    el.addEventListener("change", () => {
      state.test.speakingChecks[key] = el.checked;
      saveState();
    });
  });
}

// ---------- test buttons ----------
$("startTest").addEventListener("click", () => {
  if(!state.test.startedAt) state.test.startedAt = new Date().toISOString();
  saveState();
  alert("Test démarré ✅");
});
$("saveTest").addEventListener("click", () => { saveState(); alert("Sauvegardé ✅"); });

$("finishTest").addEventListener("click", () => {
  state.results = computeResults();
  saveState();
  renderResults();
  openTab("results");
});

// ---------- scoring ----------
function scoreSection(items, answersObj){
  let correct = 0;
  let answered = 0;
  items.forEach(it => {
    const a = answersObj[it.id];
    if(a){ answered++; if(a === it.correct) correct++; }
  });
  return { correct, total: items.length, answered, pct: items.length ? (correct/items.length)*100 : 0 };
}

function countChecks(obj){
  return Object.values(obj).filter(Boolean).length;
}

function estimateLevel(readPct, gramPct, wChecks, sChecks){
  // Rough heuristic for personal placement (not official).
  const base = (readPct + gramPct) / 2;

  // writing & speaking influence
  const prod = (wChecks/4)*100*0.5 + (sChecks/4)*100*0.5;
  const overall = base*0.7 + prod*0.3;

  if(overall < 45) return "B1/B1+";
  if(overall < 60) return "B2-";
  if(overall < 72) return "B2";
  if(overall < 82) return "B2+ / C1-";
  return "C1 (estimé)";
}

function computeResults(){
  const r = scoreSection(BANK.reading, state.test.readingAnswers);
  const g = scoreSection(BANK.grammar, state.test.grammarAnswers);
  const w = countChecks(state.test.writingChecks);
  const s = countChecks(state.test.speakingChecks);

  const level = estimateLevel(r.pct, g.pct, w, s);

  // priorities
  const priorities = [];
  if(r.pct < 70) priorities.push("Compréhension écrite : connecteurs, implicite, reformulation.");
  if(g.pct < 70) priorities.push("Grammaire/lexique : subjonctif, accords, pronoms, registre soutenu.");
  if(w < 3) priorities.push("Production écrite : structure + connecteurs + précision lexicale (180–220 mots).");
  if(s < 3) priorities.push("Production orale : plan, transitions, exemples, reformulation.");

  if(priorities.length === 0) priorities.push("Consolider C1 : simulations + correction fine + expression soutenue.");

  // strengths
  const strengths = [];
  if(r.pct >= 80) strengths.push("Bonne compréhension écrite (niveau proche C1).");
  if(g.pct >= 80) strengths.push("Grammaire/lexique solides.");
  if(w >= 3) strengths.push("Écrit bien structuré (auto-évaluation).");
  if(s >= 3) strengths.push("Oral fluide et structuré (auto-évaluation).");
  if(strengths.length === 0) strengths.push("Base présente : on va structurer la progression vers B2+/C1.");

  return {
    reading: r, grammar: g,
    writingChecks: w, speakingChecks: s,
    level, computedAt: new Date().toISOString(),
    priorities, strengths
  };
}

// ---------- results UI ----------
function renderResults(){
  const res = state.results;
  const box = $("resultSummary");
  const strengthsUl = $("strengths");
  const prioritiesUl = $("priorities");

  if(!res){
    box.innerHTML = `<p class="small">Aucun résultat pour l’instant. Fais le diagnostic.</p>`;
    strengthsUl.innerHTML = "";
    prioritiesUl.innerHTML = "";
    return;
  }

  box.innerHTML = `
    <p><b>Niveau estimé :</b> ${res.level}</p>
    <p class="small">
      Compréhension écrite: <b>${res.reading.correct}/${res.reading.total}</b> (${res.reading.pct.toFixed(0)}%) •
      Grammaire: <b>${res.grammar.correct}/${res.grammar.total}</b> (${res.grammar.pct.toFixed(0)}%) •
      Écrit (auto): <b>${res.writingChecks}/4</b> • Oral (auto): <b>${res.speakingChecks}/4</b>
    </p>
  `;

  strengthsUl.innerHTML = res.strengths.map(s => `<li>${s}</li>`).join("");
  prioritiesUl.innerHTML = res.priorities.map(p => `<li>${p}</li>`).join("");
}

$("buildPlan").addEventListener("click", () => {
  state.plan = generatePlan6Months();
  saveState();
  renderPlan();
  openTab("plan");
});

function generatePlan6Months(){
  const res = state.results || computeResults();
  const daily = parseInt(state.settings.dailyTime || 30, 10);

  const focus = {
    reading: res.reading.pct < 75,
    grammar: res.grammar.pct < 75,
    writing: res.writingChecks < 3,
    speaking: res.speakingChecks < 3
  };

  const months = [
    { title:"Mois 1 — B2 solide", goals:[
      "Stabiliser grammaire (subjonctif/accords/pronoms).",
      "Compréhension : connecteurs + implicite (texte + audio).",
      "Routine quotidienne courte mais régulière."
    ]},
    { title:"Mois 2 — Vitesse & précision", goals:[
      "Compréhension orale plus rapide (notes, repérage d’infos).",
      "Lexique C1 : reformulation, nuances, registre soutenu.",
      "Écriture : paragraphe argumentatif 1–2x/semaine."
    ]},
    { title:"Mois 3 — Connecteurs & argumentation", goals:[
      "Connecteurs avancés (concession, restriction, mise en perspective).",
      "Plan C1 : thèse / antithèse / synthèse.",
      "Oral : 2–3 min structurées, exemples concrets."
    ]},
    { title:"Mois 4 — Production forte", goals:[
      "Écrit : 180–250 mots + auto-correction (banque d’erreurs).",
      "Oral : transitions, reformulation, précision lexicale.",
      "Réduction des erreurs récurrentes."
    ]},
    { title:"Mois 5 — Simulations", goals:[
      "1 mini-test / semaine (lecture + grammaire + oral/écrit).",
      "Gestion du temps, consignes, cohérence.",
      "Révisions ciblées selon les résultats."
    ]},
    { title:"Mois 6 — Mode examen", goals:[
      "2 simulations complètes (ou 4 demi-simulations).",
      "Correction fine + amélioration du style.",
      "Stabilisation (stress, fluidité, confiance)."
    ]}
  ];

  const weeklyTemplate = buildWeeklyTemplate(focus, daily);

  return {
    createdAt: new Date().toISOString(),
    levelAtCreation: res.level,
    focus,
    dailyTime: daily,
    months,
    weeklyTemplate
  };
}

function buildWeeklyTemplate(focus, daily){
  // Simple template depending on weaknesses. Keep it practical.
  const blocks = [];
  const add = (day, items) => blocks.push({ day, items });

  // Determine emphasis
  const needs = [];
  if(focus.reading) needs.push("reading");
  if(focus.grammar) needs.push("grammar");
  if(focus.writing) needs.push("writing");
  if(focus.speaking) needs.push("speaking");
  if(needs.length === 0) needs.push("maintenance");

  const timeHint = daily <= 20 ? "⏱ 15–20 min" : daily <= 40 ? "⏱ 25–35 min" : "⏱ 45–60 min";

  const baseItems = {
    reading: ["Compréhension écrite : 1 texte + 5 questions", "Reformulation : 5 phrases"],
    grammar: ["Grammaire : 10 items ciblés", "2 phrases à corriger (accords / pronoms)"],
    writing: ["Écrit : 180–220 mots (argumentation) + correction", "Banque d’erreurs (3 erreurs)"],
    speaking: ["Oral : 2–3 min (plan + transitions) + auto-grille", "Reformulation orale : 5 phrases"],
    maintenance: ["Mix : 1 mini-texte + 5 items grammaire", "1 mini-oral 2 min"]
  };

  add("Lundi",    [timeHint, ...(focus.grammar ? baseItems.grammar : baseItems.maintenance), ...(focus.reading ? baseItems.reading.slice(0,1) : [])]);
  add("Mardi",    [timeHint, ...(focus.speaking ? baseItems.speaking : baseItems.maintenance)]);
  add("Mercredi", [timeHint, ...(focus.reading ? baseItems.reading : baseItems.maintenance), ...(focus.grammar ? ["Connecteurs : concession/opposition (10 phrases)"] : [])]);
  add("Jeudi",    [timeHint, ...(focus.writing ? baseItems.writing : baseItems.maintenance)]);
  add("Vendredi", [timeHint, "Révision : 20 flashcards C1 (connecteurs + vocab)", "Écoute : 5–10 min + résumé 3 phrases"]);
  add("Samedi",   [timeHint, "Mini-simulation : 10 Q lecture + 10 Q grammaire", ...(focus.speaking ? ["Oral : 3 min sur un sujet C1"] : [])]);
  add("Dimanche", [timeHint, "Bilan : liste des erreurs + 3 objectifs semaine prochaine", "Lecture libre : 10–15 min (article)"]);

  return blocks;
}

function renderPlan(){
  const box = $("planBox");
  if(!state.plan){
    box.textContent = "Aucun plan généré. Va dans Résultats → Générer mon plan.";
    return;
  }
  const p = state.plan;
  const focusList = Object.entries(p.focus)
    .filter(([,v])=>v)
    .map(([k])=>k)
    .join(", ") || "aucune faiblesse majeure (mode consolidation)";

  let text = "";
  text += `Plan créé le: ${new Date(p.createdAt).toLocaleString()}\n`;
  text += `Niveau au moment du plan: ${p.levelAtCreation}\n`;
  text += `Temps moyen/jour: ${p.dailyTime} min\n`;
  text += `Priorités détectées: ${focusList}\n\n`;

  p.months.forEach(m => {
    text += `=== ${m.title} ===\n`;
    m.goals.forEach(g => text += `- ${g}\n`);
    text += "\n";
  });

  text += "=== Modèle de semaine (répétable) ===\n";
  p.weeklyTemplate.forEach(d => {
    text += `\n${d.day}:\n`;
    d.items.forEach(it => text += `- ${it}\n`);
  });

  // Add user links if present
  const L = state.settings.links || {};
  const links = [L.link1, L.link2, L.link3].filter(Boolean);
  if(links.length){
    text += "\n\n=== Tes liens ===\n";
    links.forEach(x => text += `- ${x}\n`);
  }

  box.textContent = text;
}

// ---------- daily coach ----------
document.querySelectorAll(".energy").forEach(btn => {
  btn.addEventListener("click", () => {
    const minutes = parseInt(btn.dataset.energy, 10);
    renderDaily(minutes);
  });
});

function renderDaily(minutes){
  const box = $("dailyBox");
  const res = state.results || computeResults();
  const focus = (state.plan && state.plan.focus) ? state.plan.focus : {
    reading: res.reading.pct < 75,
    grammar: res.grammar.pct < 75,
    writing: res.writingChecks < 3,
    speaking: res.speakingChecks < 3
  };

  const m = minutes || parseInt(state.settings.dailyTime || 30, 10);

  const picks = [];
  if(focus.grammar) picks.push("grammar");
  if(focus.reading) picks.push("reading");
  if(focus.writing) picks.push("writing");
  if(focus.speaking) picks.push("speaking");
  if(picks.length === 0) picks.push("maintenance");

  const session = buildSession(m, picks);

  box.innerHTML = `
    <div class="block">
      <b>Ta séance (${m} min)</b>
      <ul>${session.map(s => `<li>${s}</li>`).join("")}</ul>
    </div>
  `;

  // quick suggestion links
  const L = state.settings.links || {};
  const links = [L.link1, L.link2, L.link3].filter(Boolean);
  if(links.length){
    box.innerHTML += `
      <div class="block">
        <b>Liens rapides</b>
        <ul>${links.map(u => `<li><a href="${escapeAttr(u)}" target="_blank" rel="noopener">Ouvrir</a> — ${escapeHtml(u)}</li>`).join("")}</ul>
      </div>
    `;
  } else {
    box.innerHTML += `
      <div class="block small">
        Astuce : ajoute tes liens (TV5Monde / RFI / Institut Français) dans Réglages.
      </div>
    `;
  }
}

function buildSession(minutes, picks){
  // Simple session generator
  const s = [];
  if(minutes <= 20){
    // 15–20 min: one main skill + small vocab
    const main = picks[0];
    if(main === "grammar"){
      s.push("5 min : 8 items grammaire (subjonctif/accords/pronoms).");
      s.push("5 min : corrige 3 phrases (écris la règle).");
    } else if(main === "reading"){
      s.push("8 min : lis un court article (repère connecteurs).");
      s.push("5 min : résume en 3 phrases (sans copier).");
    } else if(main === "writing"){
      s.push("10 min : mini-texte 120 mots (intro + 1 argument).");
      s.push("5 min : chasse 5 erreurs + améliore 3 mots ‘trop simples’.");
    } else if(main === "speaking"){
      s.push("8 min : oral 2 min (plan simple) + re-enregistrement 1 fois.");
      s.push("5 min : reformule 5 phrases (synonymes, registre).");
    } else {
      s.push("10 min : mix (5 grammaire + 5 vocab).");
      s.push("5 min : oral 2 min (sujet libre).");
    }
    s.push("2 min : note 3 mots C1 + 1 exemple.");
    return s;
  }

  if(minutes <= 40){
    // 25–35 min: two skills
    const main = picks[0];
    const second = picks[1] || "maintenance";
    s.push(blockFor(main, 15));
    s.push(blockFor(second, 12));
    s.push("3 min : banque d’erreurs (1 erreur → règle → 2 exemples).");
    return s;
  }

  // 45–60 min: three skills + production
  const main = picks[0];
  const second = picks[1] || "reading";
  const third = picks[2] || "grammar";
  s.push(blockFor(main, 18));
  s.push(blockFor(second, 15));
  s.push(blockFor(third, 12));
  s.push("5 min : mini production (oral 2–3 min OU écrit 150–180 mots).");
  s.push("5 min : correction (connecteurs + précision).");
  return s;
}

function blockFor(type, mins){
  if(type === "grammar") return `${mins} min : grammaire ciblée + 10 phrases à transformer (subjonctif / conditionnel / pronoms).`;
  if(type === "reading") return `${mins} min : compréhension écrite + repérage (thèse, connecteurs, implicite) + résumé 4 phrases.`;
  if(type === "writing") return `${mins} min : production écrite 180–220 mots (argumentation) + amélioration du style.`;
  if(type === "speaking") return `${mins} min : oral 3–5 min (plan + transitions) + reformulation + exemple concret.`;
  return `${mins} min : mix (lecture + grammaire + vocab).`;
}

// ---------- settings ----------
function renderSettings(){
  $("targetDate").value = state.settings.targetDate || "";
  $("dailyTime").value = String(state.settings.dailyTime || 30);
  $("link1").value = state.settings.links.link1 || "";
  $("link2").value = state.settings.links.link2 || "";
  $("link3").value = state.settings.links.link3 || "";
}

$("saveSettings").addEventListener("click", () => {
  state.settings.targetDate = $("targetDate").value || "";
  state.settings.dailyTime = parseInt($("dailyTime").value, 10);
  state.settings.links.link1 = $("link1").value.trim();
  state.settings.links.link2 = $("link2").value.trim();
  state.settings.links.link3 = $("link3").value.trim();
  saveState();
  alert("Réglages enregistrés ✅");
});

$("exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-c1-coach-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});

$("importData").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  const text = await file.text();
  try{
    const imported = JSON.parse(text);
    if(!imported || typeof imported !== "object") throw new Error("bad");
    state = Object.assign(structuredClone(DEFAULT_STATE), imported);
    saveState();
    renderAll();
    alert("Import réussi ✅");
  }catch{
    alert("Import échoué ❌");
  }
  e.target.value = "";
});

// ---------- init ----------
function renderAll(){
  renderQuestions($("readingBlock"), BANK.reading, "readingAnswers");
  renderQuestions($("grammarBlock"), BANK.grammar, "grammarAnswers");
  syncWritingSpeaking();
  renderResults();
  renderPlan();
  renderSettings();
  renderDaily(null);
}

// Escape helpers for link display
function escapeHtml(s){
  return (s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(s){
  return (s||"").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

renderAll();
