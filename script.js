console.log("FIGURINES JS OK");

// ─── paramètres ───────────────────────────────────────────────
const MIN_FRAGMENTS    = 7;    // longueur minimale d'une séquence
const MAX_FRAGMENTS    = 13;   // longueur maximale
const BRIEF_THRESHOLD  = 50;   // seuil en caractères pour la position de clôture
const ALTERNANCE       = 0.7;  // tension d'alternance (0 = aucune, 1 = stricte)
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

/**
 * charge tous les fichiers en parallèle
 */
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

/**
 * transforme en corpus structuré
 * chaque fragment porte son étiquette de source
 */
function buildCorpus(results) {
  results.forEach(([key, text]) => {
    corpus[key] = parse(text).map(t => ({ text: t, source: key }));
  });
}

/**
 * découpe en fragments (par paragraphes séparés de lignes vides)
 */
function parse(text) {
  return text
    .split(/\n\s*\n/g)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * mélange un tableau (Fisher-Yates)
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * tirage pondéré avec tension d'alternance
 * pénalise les fragments dont la source est identique au fragment précédent
 */
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

/**
 * génération de la séquence
 */
function generateSequence() {
  // nombre de fragments total tiré aléatoirement dans la plage
  const target = MIN_FRAGMENTS + Math.floor(Math.random() * (MAX_FRAGMENTS - MIN_FRAGMENTS + 1));

  // didascalie
  const didPool  = shuffle(corpus.didascalies);
  const didascalie = didPool[0] || null;

  // pool général mélangé (tirage sans remise)
  const rawPool = [
    ...corpus.texte,
    ...corpus.personnages,
    ...corpus.first,
    ...corpus.second
  ];
  const pool = shuffle(rawPool);

  // fragments brefs disponibles pour la clôture
  const briefPool = pool.filter(f => f.text.length <= BRIEF_THRESHOLD);

  sequence = [];

  if (didascalie) {
    sequence.push({ text: didascalie.text, type: "didascalie" });
  }

  // fragments intermédiaires avec alternance souple
  // on réserve la dernière position pour la clôture
  const middleTarget = target - sequence.length - 1;
  let lastSource = null;

  for (let i = 0; i < middleTarget && pool.length > 0; i++) {
    const frag = pickWeighted(pool, lastSource);
    if (!frag) break;

    pool.splice(pool.indexOf(frag), 1);
    lastSource = frag.source;
    sequence.push({ text: frag.text, type: "normal" });
  }

  // position finale : clôture — fragment bref si possible
  // on exclut du briefPool les fragments déjà utilisés
  const usedTexts = new Set(sequence.map(f => f.text));
  const remainingBrief = briefPool.filter(f => !usedTexts.has(f.text));

  const closing = remainingBrief.length > 0
    ? remainingBrief[0]
    : pool[0] || null;

  if (closing) {
    const idx = pool.findIndex(f => f.text === closing.text);
    if (idx !== -1) pool.splice(idx, 1);
    sequence.push({ text: closing.text, type: "normal" });
  }
}

/**
 * affichage
 */
function render() {
  const app = document.getElementById("app");

  app.style.maxWidth    = "700px";
  app.style.margin      = "40px auto";
  app.style.fontFamily  = "serif";
  app.style.lineHeight  = "1.6";

  app.innerHTML = sequence
    .map((f, i) => {
      if (i === 0) {
        return `<p style="font-style: italic;">${escape(f.text)}</p>`;
      }
      return `<p>${escape(f.text)}</p>`;
    })
    .join("");
}

/**
 * sécurité HTML
 */
function escape(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
}
