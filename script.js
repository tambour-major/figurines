const app = document.getElementById("app");

const files = {
  texte: "corpus/texte.txt",
  didascalies: "corpus/didascalies.txt",
  personnages: "corpus/personnages.txt",
  first: "corpus/premiere-personne.txt",
  second: "corpus/deuxieme-personne.txt"
};

async function loadFile(path) {
  const res = await fetch(path);

  if (!res.ok) {
    throw new Error("Erreur fetch: " + path);
  }

  const text = await res.text();

  return text
    .split(/\n\s*\n/)   // fragments séparés par lignes vides
    .map(s => s.trim())
    .filter(Boolean);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

async function init() {
  try {
    const [texte, didas, pers, first, second] = await Promise.all([
      loadFile(files.texte),
      loadFile(files.didascalies),
      loadFile(files.personnages),
      loadFile(files.first),
      loadFile(files.second)
    ]);

    app.innerHTML = "";

    // UNE seule didascalie au début
    const dida = document.createElement("div");
    dida.className = "didascalie";
    dida.textContent = pick(didas);
    app.appendChild(dida);

    const corpus = shuffle(texte);

    let i = 0;
    const max = 10;
    const interval = 2500; // 2.5 secondes

    const timer = setInterval(() => {
      if (i >= max) {
        clearInterval(timer);
        return;
      }

      const el = document.createElement("div");
      el.className = "fragment";
      el.textContent = corpus[i];
      app.appendChild(el);

      i++;
    }, interval);

  } catch (err) {
    console.error(err);
    app.innerHTML = "Erreur chargement corpus";
  }
}

init();
