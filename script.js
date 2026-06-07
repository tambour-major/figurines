const container = document.getElementById("container");

// -------------------------
// CORPUS
// -------------------------
const corpus = {
  base: [],
  didascalies: [],
  premiere: [],
  deuxieme: [],
  personnages: []
};

// -------------------------
// MÉMOIRE LOCALE
// -------------------------
const memoire = [];
const MEMOIRE_MAX = 20;

// -------------------------
// PROBABILITÉS
// -------------------------
const proba = {
  base: 0.4,
  didascalie: 0.2,
  premiere: 0.15,
  deuxieme: 0.15,
  personnage: 0.1
};

// -------------------------
// CHARGEMENT
// -------------------------
async function chargerCorpus() {
  const [base, didascalies, premiere, deuxieme, personnages] =
    await Promise.all([
      fetch("corpus/texte.txt").then(r => r.text()),
      fetch("corpus/didascalies.txt").then(r => r.text()),
      fetch("corpus/premiere-personne.txt").then(r => r.text()),
      fetch("corpus/deuxieme-personne.txt").then(r => r.text()),
      fetch("corpus/personnages.txt").then(r => r.text())
    ]);

  corpus.base = base.split("\n").filter(Boolean);
  corpus.didascalies = didascalies.split("\n").filter(Boolean);
  corpus.premiere = premiere.split("\n").filter(Boolean);
  corpus.deuxieme = deuxieme.split("\n").filter(Boolean);
  corpus.personnages = personnages.split("\n").filter(Boolean);
}

// -------------------------
// OUTILS
// -------------------------
function tirer(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ajouterMemoire(f) {
  memoire.push(f);
  if (memoire.length > MEMOIRE_MAX) memoire.shift();
}

function dejaVu(f) {
  return memoire.includes(f);
}

// -------------------------
// CHOIX PROBABILISTE
// -------------------------
function choisirCorpus() {
  const r = Math.random();

  if (r < proba.didascalie) return "didascalies";
  if (r < proba.didascalie + proba.premiere) return "premiere";
  if (r < proba.didascalie + proba.premiere + proba.deuxieme) return "deuxieme";
  if (r < proba.didascalie + proba.premiere + proba.deuxieme + proba.personnage) return "personnages";

  return "base";
}

// -------------------------
// GÉNÉRATION
// -------------------------
function genererFragment() {
  let fragment;
  let tentative = 0;

  do {
    const type = choisirCorpus();
    fragment = tirer(corpus[type]);
    tentative++;
  } while (dejaVu(fragment) && tentative < 10);

  ajouterMemoire(fragment);
  return fragment;
}

// -------------------------
// AFFICHAGE
// -------------------------
function afficher(fragment) {
  const el = document.createElement("div");
  el.classList.add("fragment");

  if (corpus.didascalies.includes(fragment)) {
    el.classList.add("didascalie");
  }

  el.textContent = fragment;
  container.appendChild(el);
}

// -------------------------
// BOUCLE
// -------------------------
let vitesse = 1800;

function boucle() {
  const fragment = genererFragment();
  afficher(fragment);

  setTimeout(boucle, vitesse);
}

// -------------------------
// INTERACTION
// -------------------------
document.addEventListener("click", () => {
  vitesse = Math.max(400, vitesse - 150);
});

// -------------------------
// INIT
// -------------------------
chargerCorpus().then(() => {
  console.log("corpus chargé");
  boucle();
});
