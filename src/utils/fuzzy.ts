function normalize(s: string): string {
	return String(s || "")
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^a-zа-я0-9\s-]/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/** Damerau–Levenshtein with early exit at `maxDistance`. */
function editDistanceMax(a: string, b: string, maxDistance: number): number {
	if (a === b) return 0;
	if (!a) return b.length;
	if (!b) return a.length;
	if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

	const da: Record<string, number> = {};
	const aLen = a.length;
	const bLen = b.length;
	const max = aLen + bLen;

	const d: number[][] = Array.from({ length: aLen + 2 }, () =>
		new Array(bLen + 2).fill(0),
	);
	d[0][0] = max;
	for (let i = 0; i <= aLen; i += 1) {
		d[i + 1][0] = max;
		d[i + 1][1] = i;
	}
	for (let j = 0; j <= bLen; j += 1) {
		d[0][j + 1] = max;
		d[1][j + 1] = j;
	}

	for (let i = 1; i <= aLen; i += 1) {
		let db = 0;
		let rowMin = max;
		for (let j = 1; j <= bLen; j += 1) {
			const i1 = da[b[j - 1]] || 0;
			const j1 = db;
			let cost = 1;
			if (a[i - 1] === b[j - 1]) {
				cost = 0;
				db = j;
			}
			const sub = d[i][j] + cost;
			const ins = d[i + 1][j] + 1;
			const del = d[i][j + 1] + 1;
			const trans =
				d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1);

			const v = Math.min(sub, ins, del, trans);
			d[i + 1][j + 1] = v;
			if (v < rowMin) rowMin = v;
		}
		da[a[i - 1]] = i;
		if (rowMin > maxDistance) return maxDistance + 1;
	}

	return d[aLen + 1][bLen + 1];
}

export function fuzzyIncludes(queryRaw: string, targetRaw: string): boolean {
	const q = normalize(queryRaw);
	if (!q) return true;
	const t = normalize(targetRaw);
	if (!t) return false;
	if (t.includes(q)) return true;

	// For short queries, avoid expensive edit distance.
	if (q.length <= 2) return false;

	// Token-level match with typo tolerance.
	const qParts = q.split(" ");
	const tParts = t.split(" ");

	for (const qp of qParts) {
		if (qp.length <= 2) continue;
		let ok = false;
		for (const tp of tParts) {
			if (tp.includes(qp)) {
				ok = true;
				break;
			}
			const maxD = qp.length <= 4 ? 1 : 2;
			if (editDistanceMax(qp, tp, maxD) <= maxD) {
				ok = true;
				break;
			}
		}
		if (!ok) return false;
	}
	return true;
}

