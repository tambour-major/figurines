const corpus = {
  texte: [],
  didascalies: [],
  personnages: [],
  premiere: [],
  deuxieme: []
};

async function chargerFichier(url) {
  const res = await fetch(url);
  const txt = await res.text();

  return txt
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

async function chargerCorpus() {
  corpus.texte = await chargerFichier("corpus/texte.txt");
  corpus.didascalies = await chargerFichier("corpus/didascalies.txt");
  corpus.personnages = await chargerFichier("corpus/personnages.txt");
  corpus.premiere = await chargerFichier("corpus/premiere-personne.txt");
  corpus.deuxieme = await chargerFichier("corpus/deuxieme-personne.txt");

  generer();
}

function hasard(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/* ---------------------------
   PROBABILITÉS
--------------------------- */

function choixPondere(options) {
  const total = options.reduce((s, o) => s + o.poids, 0);
  let r = Math.random() * total;

  for (const o of options) {
    r -= o.poids;
    if (r <= 0) return o.valeur;
  }
}

/* ---------------------------
   TYPE DE FIGURINE
--------------------------- */

function typeFigurine(position) {

  if (position === 0) {
    return choixPondere([
      { valeur: "didascalie", poids: 6 },
      { valeur: "personnage", poids: 2 },
      { valeur: "texte", poids: 3 }
    ]);
  }

  if (position === 1) {
    return choixPondere([
      { valeur: "personnage", poids: 3 },
      { valeur: "premiere", poids: 3 },
      { valeur: "texte", poids: 2 }
    ]);
  }

  if (position === 2) {
    return choixPondere([
      { valeur: "premiere", poids: 3 },
      { valeur: "deuxieme", poids: 3 },
      { valeur: "texte", poids: 2 }
    ]);
  }

  return choixPondere([
    { valeur: "texte", poids: 5 },
    { valeur: "personnage", poids: 2 },
    { valeur: "premiere", poids: 2 },
    { valeur: "deuxieme", poids: 1 },
    { valeur: "didascalie", poids: 2 }
  ]);
}

/* ---------------------------
   FABRIQUE FIGURINE
--------------------------- */

function figurine(type) {

  let txt = "";

  switch (type) {

    case "didascalie":
      txt = hasard(corpus.didascalies);
      break;

    case "personnage":
      txt = hasard(corpus.personnages);
      break;

    case "premiere":
      txt = hasard(corpus.premiere);
      break;

    case "deuxieme":
      txt = hasard(corpus.deuxieme);
      break;

    default:
      txt = hasard(corpus.texte);
  }

  return { type, txt };
}

/* ---------------------------
   GENERATION SCENE
--------------------------- */

function generer() {

  const plateau = document.getElementById("plateau");
  plateau.innerHTML = "";

  const sequence = [];

  for (let i = 0; i < 10; i++) {
    sequence.push(figurine(typeFigurine(i)));
  }

  sequence.forEach(f => {

    const div = document.createElement("div");
    div.className = "fragment";
    div.textContent = f.txt;

    plateau.appendChild(div);
  });
}

/* ---------------------------
   INIT
--------------------------- */

chargerCorpus();
