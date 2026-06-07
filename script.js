console.log("FIGURINES JS OK");

// CONFIG
const MAX_FRAGMENTS = 10;

let fragments = [];
let didascalie = null;

// lancement
fetch("texte.txt")
  .then(res => {
    console.log("STATUS TEXTE.TXT :", res.status);

    if (!res.ok) {
      throw new Error("Fichier texte.txt introuvable ou inaccessible");
    }

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
 * découpe par paragraphes (ligne vide = séparation de fragments)
 */
function parseCorpus(text) {
  return text
    .split(/\n\s*\n/g)
    .map(f => f.trim())
    .filter(Boolean);
}

/**
 * génère UNE seule séquence figée
 */
function generateSequence(corpus) {
  const didascalies = corpus.filter(isDidascalie);
  const autres = corpus.filter(f => !isDidascalie(f));

  // 1 seule didascalie au début
  didascalie = pickRandom(didascalies);

  fragments = [];

  if (didascalie) {
    fragments.push(didascalie);
  }

  // compléter jusqu’à 10 fragments max
  while (fragments.length < MAX_FRAGMENTS && autres.length > 0) {
    const next = pickRandom(autres);
    fragments.push(next);
  }
}

/**
 * affichage en colonne unique
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
 * heuristique simple pour les didascalies
 * (modifiable selon ton corpus réel)
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
 * tirage aléatoire simple
 */
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
