export interface OccurrenceOptions {
	overlapping?: boolean;
	caseSensitive?: boolean;
	regex?: boolean;
}

/**
 * Count literal matches (default) or ECMAScript Unicode regex matches. needle
 * is literal text or a pattern without delimiters. Defaults: overlapping=false,
 * caseSensitive=true, regex=false. Insensitive matching uses Unicode regex i,
 * not full case folding or normalization. Nonoverlap resumes at match end;
 * overlap advances one original-text code point past match start. Empty needles,
 * invalid patterns, and encountered zero-width matches error. No match returns 0.
 */
export function countOccurrences(
	text: string,
	needle: string,
	{
		overlapping = false,
		caseSensitive = true,
		regex = false,
	}: OccurrenceOptions = {},
): number {
	if (
		typeof text !== 'string' ||
		typeof needle !== 'string' ||
		needle.length === 0
	) {
		throw new TypeError(
			'text must be a string and needle must be a nonempty string',
		);
	}
	if (
		[overlapping, caseSensitive, regex].some(
			(value) => typeof value !== 'boolean',
		)
	) {
		throw new TypeError('Occurrence options must be booleans');
	}
	const pattern = regex
		? needle
		: needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const matcher = new RegExp(pattern, caseSensitive ? 'gu' : 'gui');
	let count = 0;
	for (
		let match = matcher.exec(text);
		match !== null;
		match = matcher.exec(text)
	) {
		if (match[0].length === 0)
			throw new TypeError('Zero-width regex matches are not supported');
		count += 1;
		if (overlapping) {
			const point = text.codePointAt(match.index) ?? 0;
			matcher.lastIndex = match.index + (point > 0xffff ? 2 : 1);
		}
	}
	return count;
}

/**
 * Count extended grapheme clusters with Intl.Segmenter('und', grapheme), UTF-16
 * code units, and Unicode code points independently. No normalization occurs;
 * combining marks and ZWJ emoji follow the runtime's ICU/Unicode segmentation
 * version, not a cross-version guarantee. Empty text returns all zeros.
 */
export function graphemeCount(text: string): {
	graphemes: number;
	utf16Length: number;
	codePoints: number;
} {
	if (typeof text !== 'string') throw new TypeError('text must be a string');
	let graphemes = 0;
	let codePoints = 0;
	for (const _segment of new Intl.Segmenter('und', {
		granularity: 'grapheme',
	}).segment(text)) {
		graphemes += 1;
	}
	for (const _point of text) codePoints += 1;
	return { graphemes, utf16Length: text.length, codePoints };
}
