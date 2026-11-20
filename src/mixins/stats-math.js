// Statistics for the trait statistics (TraitCategoricalStats, TraitNumericStats): p values of the chi-square and F
// distributions, quantiles, tests between groups. Plain functions, no Vue.

// The logarithm of the gamma function (Lanczos)
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
const lnGamma = z => {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z)
  }
  z -= 1
  let x = LANCZOS[0]
  for (let i = 1; i < 9; i++) {
    x += LANCZOS[i] / (z + i)
  }
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

const TINY = 1e-300
const EPSILON = 1e-15
const ITERATIONS = 1000

// The regularised upper incomplete gamma function Q(a, x)
const gammaQ = (a, x) => {
  if (x <= 0) {
    return 1
  }
  const front = Math.exp(-x + a * Math.log(x) - lnGamma(a))
  if (x < a + 1) {
    // The series of P(a, x)
    let term = 1 / a
    let sum = term
    for (let n = 1; n < ITERATIONS; n++) {
      term *= x / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * EPSILON) {
        break
      }
    }
    return Math.max(0, 1 - sum * front)
  }
  // The continued fraction of Q(a, x) (Lentz)
  let b = x + 1 - a
  let c = 1 / TINY
  let d = 1 / b
  let h = d
  for (let i = 1; i < ITERATIONS; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    d = Math.abs(d) < TINY ? TINY : d
    c = b + an / c
    c = Math.abs(c) < TINY ? TINY : c
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < EPSILON) {
      break
    }
  }
  return Math.min(1, front * h)
}

// The p value of a chi-square statistic with df degrees of freedom
const chiSquareP = (chi, df) => gammaQ(df / 2, chi / 2)

// The continued fraction of the incomplete beta function (Lentz)
const betaFraction = (a, b, x) => {
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - qab * x / qap
  d = Math.abs(d) < TINY ? TINY : d
  d = 1 / d
  let h = d
  for (let m = 1; m <= ITERATIONS; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    d = Math.abs(d) < TINY ? TINY : d
    c = 1 + aa / c
    c = Math.abs(c) < TINY ? TINY : c
    d = 1 / d
    h *= d * c
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    d = Math.abs(d) < TINY ? TINY : d
    c = 1 + aa / c
    c = Math.abs(c) < TINY ? TINY : c
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < EPSILON) {
      break
    }
  }
  return h
}
// The regularised incomplete beta function I_x(a, b)
const betaI = (a, b, x) => {
  if (x <= 0) {
    return 0
  }
  if (x >= 1) {
    return 1
  }
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2) ? front * betaFraction(a, b, x) / a : 1 - front * betaFraction(b, a, 1 - x) / b
}

// The p value of an F statistic with df1 and df2 degrees of freedom
const fP = (f, df1, df2) => f <= 0 ? 1 : betaI(df2 / 2, df1 / 2, df2 / (df2 + df1 * f))

// A quantile (0..1) of sorted numbers (linear between the two closest, as R type 7)
const quantile = (sorted, p) => {
  if (sorted.length < 1) {
    return null
  }
  const h = (sorted.length - 1) * p
  const low = Math.floor(h)
  return sorted[low] + (h - low) * ((sorted[Math.min(sorted.length - 1, low + 1)]) - sorted[low])
}

// A quantile of values given with their counts ({ x, count }, sorted by x), as quantile() on the expanded values
const quantileOfCounts = (values, total, p) => {
  if (total < 1) {
    return null
  }
  const at = position => {
    let seen = 0
    for (const v of values) {
      seen += v.count
      if (position < seen) {
        return v.x
      }
    }
    return values[values.length - 1].x
  }
  const h = (total - 1) * p
  const low = Math.floor(h)
  const a = at(low)
  return a + (h - low) * (at(Math.min(total - 1, low + 1)) - a)
}

const mean = numbers => numbers.reduce((sum, x) => sum + x, 0) / numbers.length

// One-way ANOVA between groups (arrays of numbers): F, its degrees of freedom and p, eta squared (the share of the
// variation explained by the groups), the mean squares; null without two groups and some error
const oneWayAnova = groups => {
  const used = groups.filter(g => g.length > 0)
  const n = used.reduce((sum, g) => sum + g.length, 0)
  const k = used.length
  if (k < 2 || n <= k) {
    return null
  }
  const grand = used.reduce((sum, g) => sum + g.reduce((s, x) => s + x, 0), 0) / n
  let between = 0
  let within = 0
  used.forEach(g => {
    const m = mean(g)
    between += g.length * Math.pow(m - grand, 2)
    g.forEach(x => { within += Math.pow(x - m, 2) })
  })
  const df1 = k - 1
  const df2 = n - k
  const msb = between / df1
  const msw = within / df2
  const total = between + within
  const f = msw > 0 ? msb / msw : (msb > 0 ? Infinity : 0)
  return {
    f,
    df1,
    df2,
    p: f === Infinity ? 0 : fP(f, df1, df2),
    eta2: total > 0 ? between / total : 0,
    msb,
    msw,
    n,
    k
  }
}

// Kruskal-Wallis test between groups (arrays of numbers), corrected for ties: H, its degrees of freedom and p
const kruskalWallis = groups => {
  const used = groups.filter(g => g.length > 0)
  const all = []
  used.forEach((g, i) => g.forEach(x => all.push({ x, i })))
  const n = all.length
  const k = used.length
  if (k < 2 || n <= k) {
    return null
  }
  all.sort((a, b) => a.x - b.x)
  const rankSums = used.map(() => 0)
  let ties = 0
  for (let start = 0; start < n;) {
    let end = start
    while (end + 1 < n && all[end + 1].x === all[start].x) {
      end++
    }
    // The average rank of the tied values (ranks from 1)
    const rank = (start + end) / 2 + 1
    for (let j = start; j <= end; j++) {
      rankSums[all[j].i] += rank
    }
    const t = end - start + 1
    ties += t * t * t - t
    start = end + 1
  }
  let h = 12 / (n * (n + 1)) * used.reduce((sum, g, i) => sum + rankSums[i] * rankSums[i] / g.length, 0) - 3 * (n + 1)
  const correction = 1 - ties / (n * n * n - n)
  h = correction > 0 ? h / correction : 0
  const df = k - 1
  return { h, df, p: chiSquareP(h, df) }
}

// Repeatability (broad-sense heritability on the mean of the germplasm) from a one-way ANOVA between germplasm (arrays
// of numbers): sigma2g / (sigma2g + sigma2e / n0), n0 the effective number of observations per germplasm. Null without
// germplasm with more than one observation.
const repeatability = groups => {
  const anova = oneWayAnova(groups)
  if (!anova) {
    return null
  }
  const used = groups.filter(g => g.length > 0)
  const sumSquares = used.reduce((sum, g) => sum + g.length * g.length, 0)
  const n0 = (anova.n - sumSquares / anova.n) / (anova.k - 1)
  if (n0 <= 0) {
    return null
  }
  const sigma2g = Math.max(0, (anova.msb - anova.msw) / n0)
  const sigma2e = anova.msw
  const denominator = sigma2g + sigma2e / n0
  return {
    value: denominator > 0 ? sigma2g / denominator : 0,
    sigma2g,
    sigma2e,
    n0
  }
}

// The eigenvalues and eigenvectors of a symmetric matrix (Jacobi rotations): { values, vectors }, the largest value
// first, vectors[k] the eigenvector of values[k]
const symmetricEigen = matrix => {
  const n = matrix.length
  const a = matrix.map(row => row.slice())
  const v = matrix.map((row, i) => row.map((x, j) => i === j ? 1 : 0))
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        off += a[i][j] * a[i][j]
      }
    }
    if (off < 1e-20) {
      break
    }
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) {
          continue
        }
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const sn = t * c
        for (let k = 0; k < n; k++) {
          const akp = a[k][p]
          const akq = a[k][q]
          a[k][p] = c * akp - sn * akq
          a[k][q] = sn * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k]
          const aqk = a[q][k]
          a[p][k] = c * apk - sn * aqk
          a[q][k] = sn * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p]
          const vkq = v[k][q]
          v[k][p] = c * vkp - sn * vkq
          v[k][q] = sn * vkp + c * vkq
        }
      }
    }
  }
  const order = a.map((row, i) => i).sort((i, j) => a[j][j] - a[i][i])
  return {
    values: order.map(i => a[i][i]),
    vectors: order.map(i => v.map(row => row[i]))
  }
}

// Principal component analysis of the rows of a matrix (rows: the individuals, columns: the variables, no missing
// value), each variable standardized first (mean 0, standard deviation 1: the correlation matrix), so that variables in
// different units weigh the same: { scores (per row, per component), loadings (per variable, per component: its
// correlation with the component), explained (share of the variance of each component), used (the variables kept: those
// that vary) }
const pca = rows => {
  const n = rows.length
  const p = n > 0 ? rows[0].length : 0
  const means = []
  const sds = []
  for (let j = 0; j < p; j++) {
    const column = rows.map(r => r[j])
    const m = mean(column)
    means.push(m)
    sds.push(n > 1 ? Math.sqrt(column.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (n - 1)) : 0)
  }
  const used = sds.map((s, j) => j).filter(j => sds[j] > 0)
  const z = rows.map(r => used.map(j => (r[j] - means[j]) / sds[j]))
  const k = used.length
  const correlation = used.map((_, i) => used.map((__, j) => z.reduce((sum, r) => sum + r[i] * r[j], 0) / (n - 1)))
  const { values, vectors } = symmetricEigen(correlation)
  const total = values.reduce((sum, x) => sum + Math.max(x, 0), 0) || 1
  return {
    used,
    explained: values.map(x => Math.max(x, 0) / total),
    scores: z.map(r => vectors.map(vec => vec.reduce((sum, x, i) => sum + x * r[i], 0))),
    loadings: Array.from({ length: k }, (_, i) => vectors.map((vec, c) => vec[i] * Math.sqrt(Math.max(values[c], 0))))
  }
}

// Pearson's correlation of two lists of numbers of the same length; null with fewer than three pairs or a list that
// does not vary
const pearsonR = (xs, ys) => {
  const n = xs.length
  if (n < 3) {
    return null
  }
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  return sxx > 0 && syy > 0 ? Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy))) : null
}

// The ranks of a list of numbers (1: the smallest; ties: the mean of their ranks)
const ranks = values => {
  const order = values.map((v, i) => i).sort((i, j) => values[i] - values[j])
  const result = new Array(values.length)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && values[order[j + 1]] === values[order[i]]) {
      j++
    }
    const rank = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) {
      result[order[k]] = rank
    }
    i = j + 1
  }
  return result
}

// Spearman's correlation: Pearson's of the ranks
const spearmanRho = (xs, ys) => xs.length < 3 ? null : pearsonR(ranks(xs), ranks(ys))

// The two-sided p-value of a correlation r with df degrees of freedom (t = r √(df / (1 − r²)))
const correlationP = (r, df) => {
  if (r === null || r === undefined || df < 1) {
    return null
  }
  if (Math.abs(r) >= 1) {
    return 0
  }
  const t2 = r * r * df / (1 - r * r)
  return betaI(df / 2, 0.5, df / (df + t2))
}

// The 95 % confidence interval of Pearson's r of n pairs (Fisher's z); null with fewer than four pairs
const correlationCI = (r, n) => {
  if (r === null || r === undefined || n < 4) {
    return null
  }
  const z = Math.atanh(Math.max(-0.999999, Math.min(0.999999, r)))
  const se = 1 / Math.sqrt(n - 3)
  return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)]
}

export {
  pearsonR,
  ranks,
  spearmanRho,
  correlationP,
  correlationCI,
  symmetricEigen,
  pca,
  lnGamma,
  gammaQ,
  chiSquareP,
  betaI,
  fP,
  quantile,
  quantileOfCounts,
  mean,
  oneWayAnova,
  kruskalWallis,
  repeatability
}
