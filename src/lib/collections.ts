export type Scalar = string | number | boolean | null;
export type Frequency<Item extends Scalar = Scalar> = [Item, number];

function assertItems(items: unknown): void {
	if (!Array.isArray(items)) throw new TypeError('items must be an array');
}

function assertScalar(value: unknown): asserts value is Scalar {
	if (
		value !== null &&
		typeof value !== 'string' &&
		typeof value !== 'boolean' &&
		!(typeof value === 'number' && Number.isFinite(value))
	) {
		throw new TypeError(
			'Items must be strings, finite numbers, booleans, or null',
		);
	}
}

function assertInteger(value: number, minimum: number, name: string): void {
	if (!Number.isSafeInteger(value) || value < minimum) {
		throw new RangeError(`${name} must be a safe integer >= ${minimum}`);
	}
}

function alphaKey(value: Scalar): string {
	return `${value === null ? 'null' : typeof value}:${String(value)}`;
}

function compareCodePoints(first: string, second: string): number {
	let firstIndex = 0;
	let secondIndex = 0;
	while (firstIndex < first.length && secondIndex < second.length) {
		const firstPoint = first.codePointAt(firstIndex) ?? 0;
		const secondPoint = second.codePointAt(secondIndex) ?? 0;
		if (firstPoint !== secondPoint) return firstPoint - secondPoint;
		firstIndex += firstPoint > 0xffff ? 2 : 1;
		secondIndex += secondPoint > 0xffff ? 2 : 1;
	}
	return first.length - firstIndex - (second.length - secondIndex);
}

/**
 * Count JSON scalars with type-sensitive SameValueZero equality (-0 equals 0).
 * Defaults to count_desc; equal counts keep first-seen order. first_seen keeps
 * encounter order. alpha compares Unicode code points of type:value keys:
 * boolean/null/number/string, canonical scalar text, and raw string values.
 * No coercion, normalization, or mutation; an optional nonnegative integer
 * limit returns a prefix, including [] for zero. Empty input returns [].
 */
export function frequencies<Item extends Scalar>(
	items: readonly Item[],
	{
		sort = 'count_desc',
		limit,
	}: { sort?: 'count_desc' | 'first_seen' | 'alpha'; limit?: number } = {},
): Frequency<Item>[] {
	assertItems(items);
	if (!['count_desc', 'first_seen', 'alpha'].includes(sort)) {
		throw new TypeError('Invalid frequency sort');
	}
	if (limit !== undefined) assertInteger(limit, 0, 'limit');
	const counts = new Map<Item, number>();
	for (const item of items) {
		assertScalar(item);
		counts.set(item, (counts.get(item) ?? 0) + 1);
	}
	const result = Array.from(counts, ([item, count]): Frequency<Item> => [
		item,
		count,
	]);
	if (sort === 'count_desc') {
		result.sort((first, second) => second[1] - first[1]);
	} else if (sort === 'alpha') {
		result.sort((first, second) =>
			compareCodePoints(alphaKey(first[0]), alphaKey(second[0])),
		);
	}
	return limit === undefined ? result : result.slice(0, limit);
}

/**
 * Return up to top (positive safe integer, default 1) [item,count] pairs ranked
 * by descending frequency, with first-seen ties. Scalar equality is SameValueZero,
 * type-sensitive with -0 equal to 0, without coercion or Unicode normalization.
 * Empty input returns []; input is never mutated.
 */
export function mode<Item extends Scalar>(
	items: readonly Item[],
	{ top = 1 }: { top?: number } = {},
): Frequency<Item>[] {
	assertInteger(top, 1, 'top');
	return frequencies(items, { limit: top });
}

/**
 * Remove repeated JSON scalars, defaulting to case-sensitive first retention.
 * Equality is type-sensitive SameValueZero (-0 equals 0). Insensitive strings
 * use locale-independent Unicode toLowerCase, not full folding or normalization;
 * nonstrings are unchanged. Return original first/last representatives in their
 * retained input-position order. Empty input returns []; input is not mutated.
 */
export function dedupe<Item extends Scalar>(
	items: readonly Item[],
	{
		caseSensitive = true,
		keepFirst = true,
	}: { caseSensitive?: boolean; keepFirst?: boolean } = {},
): Item[] {
	assertItems(items);
	if (typeof caseSensitive !== 'boolean' || typeof keepFirst !== 'boolean') {
		throw new TypeError('caseSensitive and keepFirst must be booleans');
	}
	const retained = new Map<Scalar, { item: Item; index: number }>();
	items.forEach((item, index) => {
		assertScalar(item);
		const key =
			!caseSensitive && typeof item === 'string' ? item.toLowerCase() : item;
		if (!keepFirst || !retained.has(key)) retained.set(key, { item, index });
	});
	return Array.from(retained.values())
		.sort((first, second) => first.index - second.index)
		.map(({ item }) => item);
}

/**
 * Count scalar own-property field values in records, returning [value,count]
 * pairs in first-seen order. Dot paths must have nonempty components and never
 * traverse arrays or inherited properties. Missing/non-scalar values error;
 * explicit null is valid. Equality is type-sensitive SameValueZero (-0 equals 0),
 * with no coercion, case folding, normalization, or mutation. Empty input is [].
 */
export function groupCount(
	records: readonly Record<string, unknown>[],
	key: string,
): Frequency[] {
	if (!Array.isArray(records)) throw new TypeError('records must be an array');
	if (
		typeof key !== 'string' ||
		key.split('.').some((part) => part.length === 0)
	) {
		throw new TypeError('key must be a nonempty dot path');
	}
	const parts = key.split('.');
	const values: Scalar[] = records.map((record) => {
		let value: unknown = record;
		for (const part of parts) {
			if (
				value === null ||
				typeof value !== 'object' ||
				Array.isArray(value) ||
				!Object.hasOwn(value, part)
			) {
				throw new TypeError(`Missing own-property path: ${key}`);
			}
			value = (value as Record<string, unknown>)[part];
		}
		assertScalar(value);
		return value;
	});
	return frequencies(values, { sort: 'first_seen' });
}
