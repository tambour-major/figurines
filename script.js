console.log("FIGURINES JS OK");

// fichiers corpus
const FILES = {
  texte: "corpus/texte.txt",
  personnages: "corpus/personnages.txt",
  first: "corpus/premiere-personne.txt",
  second: "corpus/deuxieme-personne.txt",
  didascalies: "corpus/didascalies.txt"
};

const MAX_FRAGMENTS = 10;

let corpus = {};
let sequence = [];

// lancement
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
  const entries = Object.entries(FILES);

  return Promise.all(
    entries.map(([key, path]) =>
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
 */
function buildCorpus(results) {
  results.forEach(([key, text]) => {
    corpus[key] = parse(text);
  });
}

/**
 * découpe en fragments (par paragraphes)
 */
function parse(text) {
  return text
    .split(/\n\s*\n/g)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * génération contrôlée
 */
function generateSequence() {
  const didascalie = pick(corpus.didascalies);

  const pool = [
    ...corpus.texte,
    ...corpus.personnages,
    ...corpus.first,
    ...corpus.second
  ];

  sequence = [];

  // 1 seule didascalie en premier
  if (didascalie) {
    sequence.push({ text: didascalie, type: "didascalie" });
  }

  // compléter jusqu'à 10
  while (sequence.length < MAX_FRAGMENTS) {
    const frag = pick(pool);
    if (!frag) break;

    sequence.push({ text: frag, type: "normal" });
  }
}

/**
 * affichage 1 colonne
 */
function render() {
  const app = document.getElementById("app");

  app.style.maxWidth = "700px";
  app.style.margin = "40px auto";
  app.style.fontFamily = "serif";
  app.style.lineHeight = "1.6";

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
 * tirage aléatoire simple
 */
function pick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * sécurité HTML
 */
function escape(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
