let TEXT_URL = "texte.txt";

const MAX_FRAGMENTS = 10;

let corpus = {
  all: [],
  didascalies: []
};

function parseText(raw) {
  // séparation stricte sur lignes vides
  const blocks = raw
    .split(/\n\s*\n/g)
    .map(b => b.trim())
    .filter(Boolean);

  const didascalies = [];
  const all = [];

  for (const b of blocks) {
    if (b.startsWith("(") || b.includes("[") && b.includes("]")) {
      didascalies.push(b);
    } else {
      all.push(b);
    }
  }

  return { all, didascalies };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  return arr
    .map(v => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.v);
}

function generate() {
  const container = document.getElementById("container");
  container.innerHTML = "";

  if (!corpus.all.length) return;

  const used = new Set();

  // 1 seule didascalie OBLIGATOIRE en premier
  if (corpus.didascalies.length) {
    const d = pick(corpus.didascalies);
    const dEl = document.createElement("div");
    dEl.className = "didascalie";
    dEl.textContent = d;
    container.appendChild(dEl);
    used.add(d);
  }

  let pool = shuffle(corpus.all);

  let count = 1; // déjà la didascalie

  for (let i = 0; i < pool.length && count < MAX_FRAGMENTS; i++) {
    const frag = pool[i];

    if (used.has(frag)) continue;

    const el = document.createElement("div");
    el.className = "fragment";
    el.textContent = frag;

    container.appendChild(el);

    used.add(frag);
    count++;
  }
}

fetch(TEXT_URL)
  .then(r => r.text())
  .then(text => {
    corpus = parseText(text);
    generate();
  });
