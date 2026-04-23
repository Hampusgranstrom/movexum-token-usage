/**
 * Lightweight Bayesian A/B analysis using a Beta-Binomial conjugate prior.
 * Given shown + conversions per variant, returns for each variant the
 * expected conversion rate and the probability that it beats every other.
 *
 * We use Monte-Carlo sampling (4000 draws) — fast enough for interactive
 * admin dashboards and no external math library required.
 */

export type VariantStat = {
  id: string;
  label: string;
  shown: number;
  converted: number;
};

export type VariantResult = {
  id: string;
  label: string;
  shown: number;
  converted: number;
  rate: number;
  probBest: number;
  upliftVsControl: number | null;
};

function gammaSample(shape: number): number {
  // Marsaglia & Tsang for shape >= 1; transform for shape < 1.
  if (shape < 1) {
    const u = Math.random();
    return gammaSample(shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      const u1 = Math.random();
      const u2 = Math.random();
      // Box-Muller
      x = Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u3 = Math.random();
    if (u3 < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u3) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function betaSample(a: number, b: number): number {
  const x = gammaSample(a);
  const y = gammaSample(b);
  return x / (x + y);
}

export function analyzeAb(
  variants: VariantStat[],
  opts: { draws?: number; controlId?: string | null } = {},
): VariantResult[] {
  const draws = opts.draws ?? 4000;
  if (variants.length === 0) return [];

  // Beta prior (1, 1) → uniform.
  const priorAlpha = 1;
  const priorBeta = 1;

  // Sample each variant `draws` times; count how often each wins.
  const wins = new Array(variants.length).fill(0);
  const samples: number[][] = variants.map(() => []);

  for (let d = 0; d < draws; d++) {
    let maxVal = -1;
    let maxIdx = 0;
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const s = betaSample(
        priorAlpha + v.converted,
        priorBeta + Math.max(0, v.shown - v.converted),
      );
      samples[i].push(s);
      if (s > maxVal) {
        maxVal = s;
        maxIdx = i;
      }
    }
    wins[maxIdx] += 1;
  }

  const control = opts.controlId
    ? variants.find((v) => v.id === opts.controlId)
    : undefined;
  const controlRate = control
    ? control.shown > 0
      ? control.converted / control.shown
      : 0
    : null;

  return variants.map((v, i) => {
    const rate = v.shown > 0 ? v.converted / v.shown : 0;
    const probBest = wins[i] / draws;
    const uplift =
      controlRate != null && controlRate > 0 && rate > 0
        ? rate / controlRate - 1
        : null;
    return {
      id: v.id,
      label: v.label,
      shown: v.shown,
      converted: v.converted,
      rate,
      probBest,
      upliftVsControl: v.id === opts.controlId ? 0 : uplift,
    };
  });
}
