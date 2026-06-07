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
// MÉMOIRE
// -------------------------
const memoire = [];
const MEMOIRE_MAX = 20;

// -------------------------
// PROBABILITÉS
// -------------------------
const proba = {
  base: 0.45,
  premiere: 0.2,
  deuxieme: 0.2,
  personnage: 0.15
  // didascalie retirée du flux général (IMPORTANT)
};

// -------------------------
// LIMITES
// -------------------------
const MAX_FRAGMENT = 10;
let compteur = 0;
let didascalieDejaPlacee = false;

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

  corpus.base = base.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  corpus.didascalies = didascalies.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  corpus.premiere = premiere.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  corpus.deuxieme = deuxieme.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  corpus.personnages = personnages.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
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
// CHOIX CORPUS
// -------------------------
function choisirCorpus() {
  const r = Math.random();

  if (r < proba.premiere) return "premiere";
  if (r < proba.premiere + proba.deuxieme) return "deuxieme";
  if (r < proba.premiere + proba.deuxieme + proba.personnage) return "personnages";

  return "base";
}

// -------------------------
// DIDASCALIE UNIQUE (AU DÉBUT)
// -------------------------
function placerDidascalie() {
  if (didascalieDejaPlacee || corpus.didascalies.length === 0) return;

  const d = tirer(corpus.didascalies);

  const el = document.createElement("div");
  el.classList.add("fragment", "didascalie");
  el.textContent = d;

  container.appendChild(el);

  ajouterMemoire(d);
  didascalieDejaPlacee = true;
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
  el.textContent = fragment;
  container.appendChild(el);
}

// -------------------------
// BOUCLE LIMITÉE
// -------------------------
function boucle() {
  if (compteur >= MAX_FRAGMENT) return;

  const fragment = genererFragment();
  afficher(fragment);

  compteur++;

  setTimeout(boucle, 900);
}

// -------------------------
// INIT
// -------------------------
chargerCorpus().then(() => {
  placerDidascalie(); // UNE SEULE, AU DÉBUT
  boucle();           // 10 fragments max
});
