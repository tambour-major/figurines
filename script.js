console.log("FIGURINES JS OK");

// ─── paramètres ───────────────────────────────────────────────
const MIN_FRAGMENTS    = 7;    // longueur minimale d'une séquence
const MAX_FRAGMENTS    = 13;   // longueur maximale
const BRIEF_THRESHOLD  = 50;   // seuil en caractères pour la position de clôture
const ALTERNANCE       = 0.7;  // tension d'alternance (0 = aucune, 1 = stricte)
const SCENE_WIDTH      = 60;   // largeur en caractères de la scène ASCII
// ──────────────────────────────────────────────────────────────

const FILES = {
  texte:       "corpus/texte.txt",
  personnages: "corpus/personnages.txt",
  first:       "corpus/premiere-personne.txt",
  second:      "corpus/deuxieme-personne.txt",
  didascalies: "corpus/didascalies.txt"
};

let corpus   = {};
let sequence = [];

loadAll()
  .then(buildCorpus)
  .then(generateSequence)
  .then(render)
  .catch(err => {
    console.error(err);
    document.body.innerHTML = "<p>Erreur chargement corpus</p>";
  });

// ─── chargement ───────────────────────────────────────────────

function loadAll() {
  return Promise.all(
    Object.entries(FILES).map(([key, path]) =>
      fetch(path)
        .then(res => {
          console.log(path, res.status);
          if (!res.ok) throw new Error("Erreur fetch " + path);
          return res.text().then(text => [key, text]);
        })
    )
  );
}

function buildCorpus(results) {
  results.forEach(([key, text]) => {
    corpus[key] = parse(text).map(t => ({ text: t, source: key }));
  });
}

function parse(text) {
  return text
    .split(/\n\s*\n/g)
    .map(t => t.trim())
    .filter(Boolean);
}

// ─── utilitaires ──────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWeighted(pool, lastSource) {
  if (!pool || pool.length === 0) return null;
  const weights = pool.map(f =>
    f.source === lastSource ? (1 - ALTERNANCE) : 1
  );
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

function escape(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
}

// ─── génération de la séquence ────────────────────────────────

function generateSequence() {
  const target = MIN_FRAGMENTS + Math.floor(Math.random() * (MAX_FRAGMENTS - MIN_FRAGMENTS + 1));

  const didPool    = shuffle(corpus.didascalies);
  const didascalie = didPool[0] || null;

  const rawPool = [
    ...corpus.texte,
    ...corpus.personnages,
    ...corpus.first,
    ...corpus.second
  ];
  const pool = shuffle(rawPool);

  const briefPool = pool.filter(f => f.text.length <= BRIEF_THRESHOLD);

  sequence = [];

  if (didascalie) {
    sequence.push({ text: didascalie.text, type: "didascalie", source: "didascalies" });
  }

  const middleTarget = target - sequence.length - 1;
  let lastSource = null;

  for (let i = 0; i < middleTarget && pool.length > 0; i++) {
    const frag = pickWeighted(pool, lastSource);
    if (!frag) break;
    pool.splice(pool.indexOf(frag), 1);
    lastSource = frag.source;
    sequence.push({ text: frag.text, type: "normal", source: frag.source });
  }

  const usedTexts    = new Set(sequence.map(f => f.text));
  const remainingBrief = briefPool.filter(f => !usedTexts.has(f.text));
  const closing      = remainingBrief.length > 0 ? remainingBrief[0] : pool[0] || null;

  if (closing) {
    const idx = pool.findIndex(f => f.text === closing.text);
    if (idx !== -1) pool.splice(idx, 1);
    sequence.push({ text: closing.text, type: "closing", source: closing.source });
  }
}

// ─── affichage ────────────────────────────────────────────────

function render() {
  const app = document.getElementById("app");

  app.style.maxWidth   = "700px";
  app.style.margin     = "40px auto";
  app.style.fontFamily = "serif";
  app.style.lineHeight = "1.6";

  app.innerHTML = sequence
    .map((f, i) => {
      if (i === 0) return `<p style="font-style: italic;">${escape(f.text)}</p>`;
      return `<p>${escape(f.text)}</p>`;
    })
    .join("");

  const illus = generateIllustration(sequence);
  const pre   = document.createElement("pre");
  pre.style.fontFamily = "monospace";
  pre.style.fontSize   = "0.75em";
  pre.style.lineHeight = "1.15";
  pre.style.marginTop  = "3em";
  pre.style.opacity    = "0.75";
  pre.textContent      = illus;
  app.appendChild(pre);
}

// ─── illustration ASCII ───────────────────────────────────────

/**
 * analyse un fragment et retourne son profil visuel
 */
function analyzeFragment(frag) {
  const t = frag.text;

  // longueur → hauteur de colonne
  let height;
  if (t.length <= 50)       height = 1;
  else if (t.length <= 150) height = 3;
  else if (t.length <= 300) height = 5;
  else                      height = 7;

  // source → caractère de base
  const baseChars = {
    didascalies:    "|",
    texte:          "#",
    "premiere-personne": "(",
    "deuxieme-personne": "/",
    personnages:    "*"
  };
  let ch = baseChars[frag.source] || "#";

  // diacritiques → variante organique
  const hasDiacritics = /[àâäéèêëîïôùûüçœæ]/i.test(t);
  if (hasDiacritics) {
    const variants = { "#": "%", "(": "{", "/": "j", "*": "x", "|": "¦" };
    ch = variants[ch] || ch;
  }

  // majuscules → inclinaison
  const majRatio = (t.match(/[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ]/g) || []).length / t.length;
  const tilted   = majRatio > 0.1;

  // ? ou ! → pic au sommet
  const hasPeak  = /[?!]/.test(t);

  // ponctuation → espacement
  const punctCount = (t.match(/[,;:!?.…—\-]/g) || []).length;
  const spaced     = punctCount > 3;

  // mots longs → colonne double
  const words     = t.split(/\s+/).filter(Boolean);
  const longWords = words.filter(w => w.replace(/[^a-zA-ZÀ-ÿ]/g, "").length > 6).length;
  const wide      = words.length > 0 && longWords / words.length > 0.5;

  // chiffres
  const hasNumbers = /\d/.test(t);

  return { height, ch, tilted, hasPeak, spaced, wide, hasNumbers,
           isPersonnage: frag.source === "personnages",
           isClosing: frag.type === "closing" };
}

/**
 * construit une grille vide de lignes × colonnes
 */
function makeGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(" "));
}

/**
 * écrit une chaîne dans la grille à la position (row, col)
 */
function writeAt(grid, row, col, str) {
  for (let i = 0; i < str.length; i++) {
    if (col + i >= 0 && col + i < grid[0].length && row >= 0 && row < grid.length) {
      grid[row][col + i] = str[i];
    }
  }
}

/**
 * génère l'illustration complète
 */
function generateIllustration(seq) {
  const profiles = seq.map(analyzeFragment);

  // hauteur max de scène (max colonne + marge pour ciel + personnages)
  const maxHeight  = Math.max(...profiles.map(p => p.height));
  const SKY_ROWS   = 4;
  const GROUND_ROW = SKY_ROWS + maxHeight;
  const TOTAL_ROWS = GROUND_ROW + 3; // sol + dessous
  const W          = SCENE_WIDTH;

  const grid = makeGrid(TOTAL_ROWS, W);

  // ── calcul des positions horizontales des colonnes ──────────
  // on répartit les fragments sur la largeur, en tenant compte de l'espacement
  const nonDid = profiles.filter((p, i) => i > 0); // on exclut la didascalie du sol
  let x = 2;
  const colPositions = [];

  profiles.forEach((p, i) => {
    if (i === 0) { colPositions.push(1); return; } // didascalie toujours à gauche
    colPositions.push(Math.min(x, W - 4));
    x += (p.wide ? 4 : 2) + (p.spaced ? 2 : 1);
  });

  // ── forme du sol selon le profil global ─────────────────────
  // on détecte la forme dominante
  const heights = profiles.slice(1).map(p => p.height);
  let groundChar = "_";
  const maxH = Math.max(...heights);
  const minH = Math.min(...heights);
  const midI = Math.floor(heights.length / 2);

  let shape = "plaine";
  if (heights[midI] === maxH && maxH > minH + 1) shape = "montagne";
  else if (heights[heights.length - 1] > heights[0] + 1) shape = "colline-droite";
  else if (heights[0] > heights[heights.length - 1] + 1) shape = "colline-gauche";
  else if (maxH - minH > 3) shape = "ville";

  // sol de base
  for (let c = 0; c < W; c++) {
    writeAt(grid, GROUND_ROW, c, groundChar);
  }

  // ── colonnes ────────────────────────────────────────────────
  profiles.forEach((p, i) => {
    const cx   = colPositions[i];
    const base = GROUND_ROW;

    if (i === 0) {
      // didascalie : colonne | de hauteur 2
      writeAt(grid, base - 1, cx, "|");
      writeAt(grid, base - 2, cx, "|");
      return;
    }

    if (p.isClosing) {
      // clôture : point au sol légèrement à droite
      writeAt(grid, base, Math.min(cx + 1, W - 2), ".");
      return;
    }

    const ch       = p.ch;
    const peakChar = p.hasPeak ? (ch === "/" ? "'" : "^") : ch;

    for (let row = 0; row < p.height; row++) {
      const gridRow = base - 1 - row;
      let colChar   = row === p.height - 1 ? peakChar : ch;

      if (p.tilted) {
        // inclinaison : décale vers la droite en haut si première moitié, gauche si deuxième
        const half   = profiles.length / 2;
        const offset = row > 0 ? (i < half ? 1 : -1) * Math.ceil(row / 2) : 0;
        writeAt(grid, gridRow, cx + offset, colChar);
        if (p.wide) writeAt(grid, gridRow, cx + offset + 1, colChar);
      } else {
        writeAt(grid, gridRow, cx, colChar);
        if (p.wide) writeAt(grid, gridRow, cx + 1, colChar);
      }
    }
  });

  // ── personnages ─────────────────────────────────────────────
  profiles.forEach((p, i) => {
    if (!p.isPersonnage || i === 0) return;
    const cx  = colPositions[i];
    const base = GROUND_ROW;

    if (p.height <= 2) {
      // personnage penché / assis
      writeAt(grid, base - 1, cx, "o");
      writeAt(grid, base,     cx, "/|");
    } else {
      // personnage debout
      writeAt(grid, base - 3, cx, "o");
      writeAt(grid, base - 2, cx, "|");
      writeAt(grid, base - 1, cx, "/\\");
    }
  });

  // ── arbre si beaucoup de diacritiques ───────────────────────
  const totalDiacritics = seq.reduce((n, f) =>
    n + (f.text.match(/[àâäéèêëîïôùûüçœæ]/gi) || []).length, 0);
  if (totalDiacritics > 8) {
    const tx = Math.min(W - 6, colPositions[colPositions.length - 2] + 3);
    writeAt(grid, GROUND_ROW - 3, tx + 1, "&");
    writeAt(grid, GROUND_ROW - 2, tx,     "/|\\");
    writeAt(grid, GROUND_ROW - 1, tx + 1, "|");
  }

  // ── objet géométrique si chiffres ───────────────────────────
  const hasNumbers = profiles.some(p => p.hasNumbers);
  if (hasNumbers) {
    const ox = Math.min(W - 6, Math.floor(W * 0.6));
    writeAt(grid, GROUND_ROW - 2, ox, "[=]");
    writeAt(grid, GROUND_ROW - 1, ox, "[|]");
  }

  // ── météo ────────────────────────────────────────────────────
  const totalPunct = seq.reduce((n, f) =>
    n + (f.text.match(/[,;:!?.…—\-]/g) || []).length, 0);
  const hasEllipsisDash = seq.some(f => /[…—]/.test(f.text));

  if (totalPunct > 15) {
    // pluie dispersée
    [8, 18, 30, 42, 52].forEach(c => {
      if (c < W) writeAt(grid, 1, c, ",");
    });
    [13, 25, 37, 48].forEach(c => {
      if (c < W) writeAt(grid, 2, c, ",");
    });
  }
  if (hasEllipsisDash) {
    // vent
    writeAt(grid, 0, 5,  "~  ~  ~");
    writeAt(grid, 1, 15, "~   ~");
  }

  // ── astre ────────────────────────────────────────────────────
  const seqLen = seq.length;
  if (seqLen <= 8) {
    writeAt(grid, 0, W - 4, "o");   // lune
  } else if (seqLen <= 11) {
    writeAt(grid, 0, W - 4, "*");   // étoile
  }
  // 12–13 : ciel couvert, rien

  // ── oiseau(x) si ratio voyelles élevé ───────────────────────
  const allText    = seq.map(f => f.text).join(" ");
  const vowels     = (allText.match(/[aeiouàâäéèêëîïôùûü]/gi) || []).length;
  const consonants = (allText.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
  const hasQ       = seq.some(f => /\?/.test(f.text));

  if (vowels / (vowels + consonants) > 0.6) {
    writeAt(grid, 1, Math.floor(W * 0.4), ">~");
    if (hasQ) writeAt(grid, 2, Math.floor(W * 0.55), ">~");
  }

  // ── rendu ────────────────────────────────────────────────────
  return grid
    .map(row => row.join("").trimEnd())
    .join("\n");
}
