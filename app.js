const container = document.querySelector(".container");

let fragments = [];

const globalMemory = {
  averageSpan: 4,
  regimeCounts: {}
};

function classify(line) {

  const l = line.toLowerCase();

  if (
    /(rapport|commission|procès|police|colonel|département|archive)/.test(l)
  ) {
    return "bureau";
  }

  if (
    /(mort|sang|arme|crime|tuer|cadavre|pistolet)/.test(l)
  ) {
    return "violent";
  }

  if (
    /\b(je|moi|me|mon|mes|nerfs|amour|douleur)\b/.test(l)
  ) {
    return "intime";
  }

  return "neutre";
}

function spanFromRegime(regime) {

  switch (regime) {

    case "bureau":
      return 3;

    case "violent":
      return 5;

    case "intime":
      return 7;

    default:
      return 4;
  }
}

function makeFragment(line) {

  const regime = classify(line);

  return {
    text: line,
    regime,
    span: spanFromRegime(regime),
    col: Math.floor(Math.random() * 6) + 1,
    seed: Math.random() * 1000
  };
}

function localMemory(fragment, previous) {

  if (!previous) return fragment;

  fragment.span += (previous.span - fragment.span) * 0.08;

  return fragment;
}

function drift(fragment, time) {

  const movement =
    Math.sin(time * 0.00015 + fragment.seed) * 0.15;

  fragment.col += movement;

  const maxCol = 13 - Math.round(fragment.span);

  fragment.col = Math.max(
    1,
    Math.min(maxCol, fragment.col)
  );

  return fragment;
}

function updateGlobalMemory() {

  let total = 0;

  const counts = {};

  fragments.forEach(f => {

    total += f.span;

    counts[f.regime] =
      (counts[f.regime] || 0) + 1;
  });

  globalMemory.averageSpan =
    total / fragments.length;

  globalMemory.regimeCounts = counts;
}

function globalFeedback(fragment) {

  fragment.span +=
    (globalMemory.averageSpan - fragment.span) * 0.01;

  fragment.span =
    Math.max(2, Math.min(8, fragment.span));

  return fragment;
}

function render() {

  container.innerHTML = "";

  fragments.forEach(fragment => {

    const div = document.createElement("div");

    div.className = "frag";

    div.textContent = fragment.text;

    const col = Math.round(fragment.col);
    const span = Math.round(fragment.span);

    div.style.gridColumn =
      `${col} / span ${span}`;

    container.appendChild(div);
  });
}

function loop(time) {

  fragments = fragments.map((fragment, i) => {

    fragment =
      localMemory(fragment, fragments[i - 1]);

    fragment =
      drift(fragment, time);

    fragment =
      globalFeedback(fragment);

    return fragment;
  });

  updateGlobalMemory();

  render();

  requestAnimationFrame(loop);
}

fetch("texte.txt")
  .then(response => response.text())
  .then(text => {

    fragments = text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(makeFragment);

    updateGlobalMemory();

    render();

    requestAnimationFrame(loop);
  });
