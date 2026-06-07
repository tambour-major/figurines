const container = document.querySelector(".container");

let fragments = [];
let mouse = null;
const globalMemory = {
  regimeCounts: {},
  averageSpan: 6,
  instability: 0
};

// --------- classification ---------

function classify(line) {
  const l = line.toLowerCase();

  if (/(rapport|procès|commission|termium|département|CR)/.test(l)) return "bureaucratique";
  if (/(arme|pistolet|sang|crime|mort|tue|fusillade)/.test(l)) return "violent";
  if (/\b(je|me|moi|nerfs|pensée|mal)\b/.test(l)) return "intime";
  if (/(définit|type|espèce|exemple|selon)/.test(l)) return "encyclo";
  return "narratif";
}

// --------- fragment ---------

function makeFragment(line, i) {
  return {
    text: line,
    regime: classify(line),
    col: 6,
    span: 6,
    seed: Math.random() * 1000,
    drift: Math.random() * 0.6
  };
}

// --------- mémoire locale ---------

function memory(f, prev) {
  if (!prev) return f;
  f.span += (prev.span - 6) * 0.2;
  return f;
}

// --------- dérive ---------

function drift(f, t) {
  f.col += Math.sin(t * 0.001 + f.seed) * f.drift;
  f.col = Math.max(1, Math.min(12, f.col));
  return f;
}

// --------- interaction ---------

window.addEventListener("mousemove", e => {
  mouse = { x: e.clientX, y: e.clientY };
});

function interact(f) {
  if (!mouse) return f;

  const center = mouse.x / window.innerWidth;
  f.col += (center - 0.5) * 2;
  f.span *= 0.98 + center * 0.05;

  return f;
}

// --------- mémoire globale ---------

function globalUpdate() {
  const counts = {};
  let avg = 0;

  fragments.forEach(f => {
    counts[f.regime] = (counts[f.regime] || 0) + 1;
    avg += f.span;
  });

  globalMemory.regimeCounts = counts;
  globalMemory.averageSpan = avg / fragments.length;
}

// --------- feedback ---------

function feedback(f) {
  const dominant = Object.entries(globalMemory.regimeCounts)
    .sort((a,b)=>b[1]-a[1])[0]?.[0];

  if (f.regime === dominant) {
    f.span *= 0.95;
  }

  f.span += (globalMemory.averageSpan - f.span) * 0.02;

  return f;
}

// --------- render ---------

function render() {
  container.innerHTML = "";

  fragments.forEach(f => {
    const div = document.createElement("div");
    div.className = "frag";
    div.textContent = f.text;

    div.style.gridColumn = `${Math.round(f.col)} / span ${Math.max(1, Math.round(f.span))}`;

    container.appendChild(div);
  });
}

// --------- loop ---------

function loop(t) {

  fragments = fragments.map((f, i) => {
    const prev = fragments[i - 1];

    f = memory(f, prev);
    f = drift(f, t);
    f = interact(f);
    f = feedback(f);

    return f;
  });

  globalUpdate();
  render();

  requestAnimationFrame(loop);
}

// --------- init ---------

fetch("texte.txt")
  .then(r => r.text())
  .then(text => {
    fragments = text
      .split("\n")
      .filter(Boolean)
      .map(makeFragment);

    requestAnimationFrame(loop);
  });
