console.log("FIGURINES JS OK");

// ─── paramètres ───────────────────────────────────────────────
const MIN_FRAGMENTS    = 7;    // longueur minimale d'une séquence
const MAX_FRAGMENTS    = 13;   // longueur maximale
const BRIEF_THRESHOLD  = 50;   // seuil en caractères pour la position de clôture
const ALTERNANCE       = 0.7;  // tension d'alternance (0 = aucune, 1 = stricte)
const SCENE_WIDTH      = 62;   // largeur en caractères de la scène ASCII
const SKY_ROWS         = 5;    // lignes de ciel au-dessus du relief max
// ──────────────────────────────────────────────────────────────

const FILES = {
  texte:            "corpus/texte.txt",
  personnages:      "corpus/personnages.txt",
  first:            "corpus/premiere-personne.txt",
  second:           "corpus/deuxieme-personne.txt",
  didascalies:      "corpus/didascalies.txt"
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

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── génération de la séquence ────────────────────────────────

function generateSequence() {
  const target     = MIN_FRAGMENTS + Math.floor(Math.random() * (MAX_FRAGMENTS - MIN_FRAGMENTS + 1));
  const didPool    = shuffle(corpus.didascalies);
  const didascalie = didPool[0] || null;

  const rawPool = [
    ...corpus.texte,
    ...corpus.personnages,
    ...corpus.first,
    ...corpus.second
  ];
  const pool      = shuffle(rawPool);
  const briefPool = pool.filter(f => f.text.length <= BRIEF_THRESHOLD);

  sequence = [];

  if (didascalie) {
    sequence.push({ text: didascalie.text, type: "didascalie", source: "didascalies" });
  }

  const middleTarget = target - sequence.length - 1;
  let lastSource     = null;

  for (let i = 0; i < middleTarget && pool.length > 0; i++) {
    const frag = pickWeighted(pool, lastSource);
    if (!frag) break;
    pool.splice(pool.indexOf(frag), 1);
    lastSource = frag.source;
    sequence.push({ text: frag.text, type: "normal", source: frag.source });
  }

  const usedTexts      = new Set(sequence.map(f => f.text));
  const remainingBrief = briefPool.filter(f => !usedTexts.has(f.text));
  const closing        = remainingBrief.length > 0 ? remainingBrief[0] : pool[0] || null;

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

// ─── analyse d'un fragment ────────────────────────────────────

function analyzeFragment(frag) {
  const t = frag.text;

  // hauteur de colonne selon longueur
  let height;
  if (t.length <= 50)       height = 1;
  else if (t.length <= 150) height = 3;
  else if (t.length <= 300) height = 5;
  else                      height = 7;

  // caractère de base selon source
  const baseChars = {
    didascalies:          "|",
    texte:                "#",
    "premiere-personne":  "(",
    "deuxieme-personne":  "/",
    personnages:          "*"
  };
  let ch = baseChars[frag.source] || "#";

  // variante si diacritiques
  const hasDiacritics = /[àâäéèêëîïôùûüçœæ]/i.test(t);
  if (hasDiacritics) {
    const variants = { "#": "%", "(": "{", "/": "j", "*": "x", "|": "¦" };
    ch = variants[ch] || ch;
  }

  // inclinaison si beaucoup de majuscules
  const majRatio = (t.match(/[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ]/g) || []).length / t.length;
  const tilted   = majRatio > 0.1;

  // pic si ? ou !
  const hasPeak  = /[?!]/.test(t);

  // espacement si beaucoup de ponctuation
  const punctCount = (t.match(/[,;:!?.…—\-]/g) || []).length;
  const spaced     = punctCount > 3;

  // colonne double si mots majoritairement longs
  const words     = t.split(/\s+/).filter(Boolean);
  const longWords = words.filter(w => w.replace(/[^a-zA-ZÀ-ÿ]/g, "").length > 6).length;
  const wide      = words.length > 0 && (longWords / words.length) > 0.5;

  return {
    height,
    ch,
    tilted,
    hasPeak,
    spaced,
    wide,
    hasNumbers:  /\d/.test(t),
    isPersonnage: frag.source === "personnages",
    isClosing:   frag.type === "closing",
    isDid:       frag.type === "didascalie"
  };
}

// ─── grille ASCII ─────────────────────────────────────────────

function makeGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(" "));
}

function writeAt(grid, row, col, str) {
  for (let i = 0; i < str.length; i++) {
    const c = col + i;
    if (row >= 0 && row < grid.length && c >= 0 && c < grid[0].length) {
      grid[row][c] = str[i];
    }
  }
}

// ─── interpolation du relief ──────────────────────────────────

/**
 * à partir des ancres (positions x, hauteurs h des fragments),
 * produit un tableau ground[0..W-1] par interpolation cosinus lissée
 */
function buildGroundProfile(anchors, W) {
  const ground = new Array(W).fill(0);

  // interpolation cosinus entre chaque paire d'ancres
  for (let a = 0; a < anchors.length - 1; a++) {
    const x0 = anchors[a].x,   h0 = anchors[a].h;
    const x1 = anchors[a+1].x, h1 = anchors[a+1].h;
    for (let x = x0; x <= x1; x++) {
      const t  = (x - x0) / (x1 - x0);
      const tc = (1 - Math.cos(t * Math.PI)) / 2; // cosinus → transition douce
      ground[x] = Math.round(h0 + (h1 - h0) * tc);
    }
  }

  // remplir les bords avant la première ancre et après la dernière
  for (let x = 0; x < anchors[0].x; x++) {
    ground[x] = anchors[0].h;
  }
  for (let x = anchors[anchors.length - 1].x; x < W; x++) {
    ground[x] = anchors[anchors.length - 1].h;
  }

  // passe de lissage (moyenne mobile sur 3)
  const smoothed = [...ground];
  for (let x = 1; x < W - 1; x++) {
    smoothed[x] = Math.round((ground[x-1] + ground[x] + ground[x+1]) / 3);
  }

  return smoothed;
}

/**
 * choisit le caractère de sol selon la pente locale
 */
function groundChar(ground, x) {
  const here  = ground[x];
  const left  = x > 0               ? ground[x-1] : here;
  const right = x < ground.length-1 ? ground[x+1] : here;
  const slope = right - left;
  if (slope >  1) return "/";
  if (slope < -1) return "\\";
  if (slope ===  1) return "/";
  if (slope === -1) return "\\";
  return "_";
}

// ─── illustration principale ──────────────────────────────────

function generateIllustration(seq) {
  const W        = SCENE_WIDTH;
  const profiles = seq.map(analyzeFragment);

  // hauteur max des colonnes
  const maxColH  = Math.max(...profiles.map(p => p.height));

  // nombre de lignes total : ciel + relief max + colonnes max + 2 lignes de sol
  const TOTAL_ROWS = SKY_ROWS + maxColH + 4;
  const grid       = makeGrid(TOTAL_ROWS, W);

  // ── positions horizontales des fragments ───────────────────
  // on répartit uniformément sur 90% de la largeur
  const n         = profiles.length;
  const margin    = 3;
  const usable    = W - margin * 2;
  const positions = profiles.map((p, i) =>
    margin + Math.round((i / (n - 1 || 1)) * usable)
  );

  // ── ancres du relief ───────────────────────────────────────
  // chaque fragment contribue une hauteur de sol proportionnelle
  // la hauteur de sol est INVERSE de la hauteur de colonne :
  // fragment haut → sol bas (vallée), fragment court → sol haut (colline)
  // — pour que les colonnes hautes ressortent davantage
  const maxH    = Math.max(...profiles.map(p => p.height));
  const anchors = profiles.map((p, i) => ({
    x: positions[i],
    h: p.isClosing ? 1 : clamp(maxH - p.height + 1, 1, maxH)
  }));

  // ajouter ancres aux bords pour que le sol s'étende bien
  anchors.unshift({ x: 0,     h: anchors[0].h });
  anchors.push(   { x: W - 1, h: anchors[anchors.length - 1].h });

  const ground = buildGroundProfile(anchors, W);

  // ligne de référence : là où le sol le plus bas touche le bas de la scène
  const groundBase = TOTAL_ROWS - 2;
  // ground[x] est la hauteur du sol en lignes au-dessus de groundBase

  // ── dessin du sol ──────────────────────────────────────────
  for (let x = 0; x < W; x++) {
    const row = groundBase - ground[x];
    writeAt(grid, row, x, groundChar(ground, x));

    // une ligne de points sous le sol pour donner de la masse
    if (ground[x] > 1) writeAt(grid, row + 1, x, ".");
  }

  // ── colonnes de fragments ──────────────────────────────────
  profiles.forEach((p, i) => {
    const cx      = positions[i];
    const solRow  = groundBase - ground[cx]; // ligne du sol à cette position
    const half    = Math.floor(n / 2);

    if (p.isClosing) {
      // point de clôture posé sur le sol
      writeAt(grid, solRow, cx, ".");
      return;
    }

    const peakChar = p.hasPeak ? "^" : p.ch;

    for (let row = 0; row < p.height; row++) {
      const gridRow = solRow - 1 - row;
      const isTop   = row === p.height - 1;
      let c         = isTop ? peakChar : p.ch;

      if (p.tilted && row > 0) {
        const offset = i < half
          ? Math.ceil(row / 2)
          : -Math.ceil(row / 2);
        writeAt(grid, gridRow, clamp(cx + offset, 0, W - 2), c);
        if (p.wide) writeAt(grid, gridRow, clamp(cx + offset + 1, 0, W - 2), c);
      } else {
        writeAt(grid, gridRow, cx, c);
        if (p.wide) writeAt(grid, gridRow, clamp(cx + 1, 0, W - 2), c);
      }
    }
  });

  // ── personnages (posés sur le sol à leur position) ─────────
  profiles.forEach((p, i) => {
    if (!p.isPersonnage || p.isDid) return;
    const cx     = positions[i];
    const solRow = groundBase - ground[cx];

    if (p.height <= 2) {
      // assis / penché
      writeAt(grid, solRow - 1, cx, "o");
      writeAt(grid, solRow,     cx, "/|");
    } else {
      // debout
      writeAt(grid, solRow - 3, cx, "o");
      writeAt(grid, solRow - 2, cx, "|");
      writeAt(grid, solRow - 1, cx, "/\\");
    }
  });

  // ── arbre si beaucoup de diacritiques ─────────────────────
  const totalDiacritics = seq.reduce((n, f) =>
    n + (f.text.match(/[àâäéèêëîïôùûüçœæ]/gi) || []).length, 0);
  if (totalDiacritics > 8) {
    const tx     = clamp(positions[Math.floor(n * 0.7)], 3, W - 6);
    const solRow = groundBase - ground[tx];
    writeAt(grid, solRow - 4, tx + 1, "&");
    writeAt(grid, solRow - 3, tx,     "/|\\");
    writeAt(grid, solRow - 2, tx + 1, "|");
  }

  // ── objet géométrique si chiffres ─────────────────────────
  const hasNumbers = profiles.some(p => p.hasNumbers);
  if (hasNumbers) {
    const ox     = clamp(Math.floor(W * 0.55), 3, W - 6);
    const solRow = groundBase - ground[ox];
    writeAt(grid, solRow - 2, ox, "[=]");
    writeAt(grid, solRow - 1, ox, "[|]");
  }

  // ── météo ─────────────────────────────────────────────────
  const totalPunct = seq.reduce((n, f) =>
    n + (f.text.match(/[,;:!?.…—\-]/g) || []).length, 0);
  const hasEllipsisDash = seq.some(f => /[…—]/.test(f.text));

  if (totalPunct > 15) {
    [7, 17, 29, 41, 53].forEach(c => { if (c < W) writeAt(grid, 1, c, ","); });
    [12, 23, 36, 47].forEach(c =>    { if (c < W) writeAt(grid, 2, c, ","); });
  }
  if (hasEllipsisDash) {
    writeAt(grid, 0, 4,  "~   ~   ~");
    writeAt(grid, 1, 14, "~    ~");
  }

  // ── astre ─────────────────────────────────────────────────
  if (seq.length <= 8) {
    writeAt(grid, 0, W - 5, "o");
  } else if (seq.length <= 11) {
    writeAt(grid, 0, W - 5, "*");
  }

  // ── oiseau(x) si ratio voyelles élevé ─────────────────────
  const allText    = seq.map(f => f.text).join(" ");
  const vowels     = (allText.match(/[aeiouàâäéèêëîïôùûü]/gi) || []).length;
  const consonants = (allText.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
  const hasQ       = seq.some(f => /\?/.test(f.text));

  if (consonants > 0 && vowels / (vowels + consonants) > 0.6) {
    writeAt(grid, 2, Math.floor(W * 0.38), ">~");
    if (hasQ) writeAt(grid, 3, Math.floor(W * 0.55), ">~");
  }

  // ── rendu ─────────────────────────────────────────────────
  return grid
    .map(row => row.join("").trimEnd())
    .join("\n");
}
