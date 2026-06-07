console.log("FIGURINES JS OK");

// CONFIG
const MAX_FRAGMENTS = 10;

// état global de la génération
let fragments = [];
let didascalie = null;

// charger le corpus
fetch("texte.txt")
  .then(res => {
    console.log("STATUS TEXTE.TXT :", res.status);
    if (!res.ok) throw new Error("Fichier introuvable ou inaccessible");
    return res.text();
  })
  .then(text => {
    console.log("CORPUS CHARGÉ :", text.length);

    const corpus = parseCorpus(text);
    generateSequence(corpus);
    render();
  })
  .catch(err => {
    console.error("ERREUR FETCH :", err);
    document.body.innerHTML = "<p>Erreur chargement corpus</p>";
  });

/**
 * découpe le texte en fragments
 * règle importante : séparation uniquement par ligne vide
 */
function parseCorpus(text) {
  return text
    .split(/\n\s*\n/g) // <-- clé : paragraphes séparés par ligne vide
    .map(f => f.trim())
    .filter(Boolean);
}

/**
 * génère une séquence figée (UNE SEULE FOIS)
 */
function generateSequence(corpus) {
  const didascalies = corpus.filter(isDidascalie);
  const autres = corpus.filter(f => !isDidascalie(f));

  // 1 seule didascalie au début
  didascalie = pickRandom(didascalies);

  fragments = [didascalie];

  // remplir jusqu’à 10 max
  while (fragments.length < MAX_FRAGMENTS) {
    const next = weightedPick(autres);
    if (!next) break;
    fragments.push(next);
  }
}

/**
 * affichage en 1 colonne fixe
 */
function render() {
  const app = document.getElementById("app");

  app.style.display = "block";
  app.style.maxWidth = "700px";
  app.style.margin = "40px auto";
  app.style.lineHeight = "1.6";
  app.style.fontFamily = "serif";

  app.innerHTML = fragments
    .map((f, i) => {
      if (i === 0) {
        return `<p style="font-style: italic;">${escapeHtml(f)}</p>`;
      }
      return `<p>${escapeHtml(f)}</p>`;
    })
    .join("");
}

/**
 * heuristique simple pour détecter didascalies
 * (tu pourras raffiner plus tard avec tes corpus)
 */
function isDidascalie(f) {
  return (
    f.startsWith("(") ||
    f.toLowerCase().includes("procès-verbal") ||
    f.toLowerCase().includes("note") ||
    f.toLowerCase().includes("instruction")
  );
}

/**
 * tirage pondéré simple (favorise variété sans boucle infinie)
 */
function weightedPick(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * sécurité HTML
 */
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
