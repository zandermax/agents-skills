import { parseDocument, stringify } from "yaml";

export interface ParsedDocument {
	readonly attributes: Readonly<Record<string, unknown>>;
	readonly body: string;
}

function createFrontmatterError(sourceName: string, message: string): Error {
	return new Error(`${sourceName}: ${message}`);
}

function findClosingDelimiter(source: string, searchFrom: number): number {
	let cursor = searchFrom;

	while (cursor <= source.length) {
		const nextNewline = source.indexOf("\n", cursor);
		const lineEnd = nextNewline === -1 ? source.length : nextNewline;
		const rawLine = source.slice(cursor, lineEnd);
		const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

		if (line === "---") {
			return lineEnd;
		}

		if (nextNewline === -1) {
			break;
		}

		cursor = nextNewline + 1;
	}

	return -1;
}

export function parseFrontmatter(
	source: string,
	sourceName: string,
): ParsedDocument {
	const firstNewline = source.indexOf("\n");
	const firstLineEnd = firstNewline === -1 ? source.length : firstNewline;
	const firstLineRaw = source.slice(0, firstLineEnd);
	const firstLine = firstLineRaw.endsWith("\r")
		? firstLineRaw.slice(0, -1)
		: firstLineRaw;

	if (firstLine !== "---") {
		return {
			attributes: {},
			body: source,
		};
	}

	if (firstNewline === -1) {
		throw createFrontmatterError(
			sourceName,
			"frontmatter opening delimiter is missing a closing delimiter",
		);
	}

	const yamlStart = firstNewline + 1;
	const closingLineEnd = findClosingDelimiter(source, yamlStart);

	if (closingLineEnd === -1) {
		throw createFrontmatterError(
			sourceName,
			"frontmatter is missing a closing delimiter",
		);
	}

	const closingLineStart = source.lastIndexOf("\n", closingLineEnd - 1) + 1;
	const yamlSource = source.slice(yamlStart, closingLineStart);
	const document = parseDocument(yamlSource, { uniqueKeys: true });

	if (document.errors.length > 0) {
		const details = document.errors.map((error) => error.message).join("; ");
		throw createFrontmatterError(
			sourceName,
			`invalid frontmatter YAML: ${details}`,
		);
	}

	const parsed = document.toJS() as unknown;

	if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
		throw createFrontmatterError(
			sourceName,
			"frontmatter YAML must be an object mapping",
		);
	}

	const bodyStart =
		closingLineEnd === source.length ? source.length : closingLineEnd + 1;

	return {
		attributes: parsed as Readonly<Record<string, unknown>>,
		body: source.slice(bodyStart),
	};
}

export function renderFrontmatter(
	attributes: Readonly<Record<string, unknown>>,
): string {
	const rendered = stringify(attributes, { sortMapEntries: false });
	return `---\n${rendered}---\n`;
}
