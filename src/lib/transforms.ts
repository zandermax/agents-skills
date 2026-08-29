export interface ExactTransform {
	readonly id: string;
	readonly operation: "remove" | "replace";
	readonly search: string;
	readonly replacement?: string;
	readonly expectedCount: number;
}

const TRANSFORM_KEYS = new Set([
	"id",
	"operation",
	"search",
	"replacement",
	"expectedCount",
]);

function createTransformError(sourceName: string, message: string): Error {
	return new Error(`${sourceName}: ${message}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && !Array.isArray(value) && typeof value === "object";
}

function countLiteralOccurrences(source: string, search: string): number {
	if (search.length === 0) {
		return 0;
	}

	let count = 0;
	let cursor = 0;

	while (cursor <= source.length - search.length) {
		const index = source.indexOf(search, cursor);
		if (index === -1) {
			break;
		}

		count += 1;
		cursor = index + search.length;
	}

	return count;
}

function replaceLiteral(
	source: string,
	search: string,
	replacement: string,
): string {
	if (search.length === 0) {
		return source;
	}

	return source.split(search).join(replacement);
}

function validateAllowedKeys(
	entry: Record<string, unknown>,
	sourceName: string,
	index: number,
): void {
	for (const key of Object.keys(entry)) {
		if (!TRANSFORM_KEYS.has(key)) {
			throw createTransformError(
				sourceName,
				`transform at index ${index} has unknown key: ${key}`,
			);
		}
	}
}

export function loadTransforms(
	value: unknown,
	sourceName: string,
): readonly ExactTransform[] {
	if (!Array.isArray(value)) {
		throw createTransformError(sourceName, "transforms must be an array");
	}

	const ids = new Set<string>();
	const transforms: ExactTransform[] = [];

	for (let index = 0; index < value.length; index += 1) {
		const entry = value[index];

		if (!isPlainObject(entry)) {
			throw createTransformError(
				sourceName,
				`transform at index ${index} must be an object`,
			);
		}

		validateAllowedKeys(entry, sourceName, index);

		const id = entry.id;
		if (typeof id !== "string" || id.length === 0) {
			throw createTransformError(
				sourceName,
				`transform at index ${index} has invalid id; expected non-empty string`,
			);
		}

		if (ids.has(id)) {
			throw createTransformError(sourceName, `duplicate transform id: ${id}`);
		}
		ids.add(id);

		const operation = entry.operation;
		if (operation !== "remove" && operation !== "replace") {
			throw createTransformError(
				sourceName,
				`transform ${id} has invalid operation; expected remove or replace`,
			);
		}

		const search = entry.search;
		if (typeof search !== "string" || search.length === 0) {
			throw createTransformError(
				sourceName,
				`transform ${id} has invalid search; expected non-empty string`,
			);
		}

		const expectedCount = entry.expectedCount;
		if (
			typeof expectedCount !== "number" ||
			!Number.isInteger(expectedCount) ||
			expectedCount < 0
		) {
			throw createTransformError(
				sourceName,
				`transform ${id} has invalid expectedCount; expected non-negative integer`,
			);
		}

		const replacement = entry.replacement;
		if (operation === "replace") {
			if (typeof replacement !== "string") {
				throw createTransformError(
					sourceName,
					`transform ${id} requires string replacement for replace operation`,
				);
			}

			const transform: ExactTransform = {
				id,
				operation,
				search,
				replacement,
				expectedCount,
			};

			Object.freeze(transform);
			transforms.push(transform);
			continue;
		} else if (replacement !== undefined) {
			throw createTransformError(
				sourceName,
				`transform ${id} must not define replacement for remove operation`,
			);
		}

		const transform: ExactTransform = {
			id,
			operation,
			search,
			expectedCount,
		};

		Object.freeze(transform);
		transforms.push(transform);
	}

	return Object.freeze(transforms);
}

export function applyExactTransforms(
	source: string,
	transforms: readonly ExactTransform[],
): string {
	let result = source;

	for (const transform of transforms) {
		const foundCount = countLiteralOccurrences(result, transform.search);

		if (foundCount !== transform.expectedCount) {
			throw new Error(
				`transform ${transform.id}: expected ${transform.expectedCount} matches but found ${foundCount}`,
			);
		}

		if (transform.operation === "remove") {
			result = replaceLiteral(result, transform.search, "");
		} else {
			if (transform.replacement === undefined) {
				throw new Error(
					`transform ${transform.id}: replace operation requires replacement`,
				);
			}

			result = replaceLiteral(result, transform.search, transform.replacement);
		}
	}

	return result;
}
