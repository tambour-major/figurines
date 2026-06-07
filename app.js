const scene = document.querySelector("#scene");

const VISIBLE = 30;

let figurines = [];

const lexiques = {

  corps: [
    "main",
    "sang",
    "yeux",
    "visage",
    "nerfs",
    "corps"
  ],

  religion: [
    "dieu",
    "église",
    "sorcière",
    "sorcier",
    "saint"
  ],

  amour: [
    "amour",
    "désir",
    "jalouse",
    "baiser",
    "aime"
  ],

  police: [
    "crime",
    "colonel",
    "police",
    "commissariat",
    "arme"
  ],

  mort: [
    "mort",
    "mourir",
    "cadavre",
    "tombe",
    "pendu"
  ]
};

function tagsDuTexte(texte) {

  const t = texte.toLowerCase();

  const tags = [];

  Object.entries(lexiques).forEach(([tag, mots]) => {

    if (
      mots.some(mot => t.includes(mot))
    ) {
      tags.push(tag);
    }

  });

  return tags;
}

function creerFigurine(texte, id) {

  return {

    id,

    texte,

    tags: tagsDuTexte(texte),

    age: 0,

    visible: false
  };
}

function score(a, b) {

  let s = 0;

  a.tags.forEach(tag => {

    if (b.tags.includes(tag)) {

      s += 1;

    }

  });

  return s;
}

function choisirVoisine(source) {

  const candidates =
    figurines.filter(f => !f.visible);

  if (!candidates.length) return null;

  candidates.sort((a,b) =>
    score(source,b) - score(source,a)
  );

  return candidates[0];
}

function apparitionInitiale() {

  figurines
    .sort(() => Math.random() - 0.5)
    .slice(0, VISIBLE)
    .forEach(f => {

      f.visible = true;

    });

}

function afficher() {

  scene.innerHTML = "";

  figurines
    .filter(f => f.visible)
    .forEach(f => {

      const div =
        document.createElement("div");

      const span =
        3 + (f.tags.length % 4);

      div.className =
        `fig age${Math.min(f.age,4)}`;

      div.textContent =
        f.texte;

      div.style.gridColumn =
        `span ${span}`;

      scene.appendChild(div);

    });

}

function cycle() {

  const visibles =
    figurines.filter(f => f.visible);

  visibles.forEach(f => {

    f.age++;

  });

  const mourantes =
    visibles.filter(f => f.age > 4);

  mourantes.forEach(f => {

    f.visible = false;

    f.age = 0;

    const remplaçante =
      choisirVoisine(f);

    if (remplaçante) {

      remplaçante.visible = true;

    }

  });

  afficher();
}

fetch("texte.txt")
.then(r => r.text())
.then(text => {

  figurines = text
    .split("\n")
    .map(t => t.trim())
    .filter(Boolean)
    .map(creerFigurine);

  apparitionInitiale();

  afficher();

  setInterval(cycle, 8000);

});
