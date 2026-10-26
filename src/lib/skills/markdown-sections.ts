export interface MarkdownSection {
	readonly heading: string;
	readonly level: number;
	readonly content: string;
	readonly startLine: number;
	readonly endLine: number;
}

type MutableSection = {
	heading: string;
	level: number;
	startLine: number;
	endLine: number;
	startOffset: number;
	endOffset: number;
};

type FenceState = {
	marker: "`" | "~";
	length: number;
};

function getFenceIndent(line: string): number | null {
	let indent = 0;

	while (indent < line.length && line[indent] === " ") {
		indent += 1;
	}

	if (indent > 3) {
		return null;
	}

	return indent;
}

function isFenceOpen(line: string): FenceState | null {
	if (line.length < 3) {
		return null;
	}

	const indent = getFenceIndent(line);
	if (indent === null) {
		return null;
	}

	const first = line[indent];

	if (first !== "`" && first !== "~") {
		return null;
	}

	let count = 0;
	while (indent + count < line.length && line[indent + count] === first) {
		count += 1;
	}

	if (count < 3) {
		return null;
	}

	return {
		marker: first,
		length: count,
	};
}

function isFenceClose(line: string, fence: FenceState): boolean {
	if (line.length < fence.length) {
		return false;
	}

	const indent = getFenceIndent(line);
	if (indent === null || line.length - indent < fence.length) {
		return false;
	}

	let count = 0;
	while (
		indent + count < line.length &&
		line[indent + count] === fence.marker
	) {
		count += 1;
	}

	if (count < fence.length) {
		return false;
	}

	for (let index = indent + count; index < line.length; index += 1) {
		const character = line[index];
		if (character !== " " && character !== "\t") {
			return false;
		}
	}

	return true;
}

function parseHeading(line: string): { level: number; heading: string } | null {
	if (line.length === 0 || line[0] !== "#") {
		return null;
	}

	let level = 0;
	while (level < line.length && line[level] === "#") {
		level += 1;
	}

	if (level < 1 || level > 6) {
		return null;
	}

	const separator = line[level];
	if (separator !== " " && separator !== "\t") {
		return null;
	}

	const heading = line.slice(level + 1).trim();
	return { level, heading };
}

function createError(sourceName: string, message: string): Error {
	return new Error(`${sourceName}: ${message}`);
}

export function listSections(markdown: string): readonly MarkdownSection[] {
	const mutableSections: MutableSection[] = [];
	const stack: number[] = [];

	let fence: FenceState | null = null;
	let cursor = 0;
	let lineNumber = 1;

	while (cursor < markdown.length) {
		const nextNewline = markdown.indexOf("\n", cursor);
		const lineEnd = nextNewline === -1 ? markdown.length : nextNewline;
		const lineStart = cursor;
		const lineTextRaw = markdown.slice(lineStart, lineEnd);
		const lineText = lineTextRaw.endsWith("\r")
			? lineTextRaw.slice(0, -1)
			: lineTextRaw;

		if (fence === null) {
			const openingFence = isFenceOpen(lineText);
			if (openingFence !== null) {
				fence = openingFence;
			} else {
				const parsedHeading = parseHeading(lineText);
				if (parsedHeading !== null) {
					while (stack.length > 0) {
						const topIndex = stack[stack.length - 1];
						if (topIndex === undefined) {
							break;
						}

						const topSection = mutableSections[topIndex];
						if (topSection === undefined) {
							break;
						}

						if (topSection.level < parsedHeading.level) {
							break;
						}

						topSection.endLine = lineNumber - 1;
						topSection.endOffset = lineStart;
						stack.pop();
					}

					mutableSections.push({
						heading: parsedHeading.heading,
						level: parsedHeading.level,
						startLine: lineNumber,
						endLine: lineNumber,
						startOffset: lineStart,
						endOffset: markdown.length,
					});

					stack.push(mutableSections.length - 1);
				}
			}
		} else if (isFenceClose(lineText, fence)) {
			fence = null;
		}

		if (nextNewline === -1) {
			cursor = markdown.length;
		} else {
			cursor = nextNewline + 1;
		}

		lineNumber += 1;
	}

	const finalLine = lineNumber - 1;

	while (stack.length > 0) {
		const topIndex = stack.pop();
		if (topIndex === undefined) {
			continue;
		}

		const topSection = mutableSections[topIndex];
		if (topSection === undefined) {
			continue;
		}

		topSection.endLine = finalLine;
		topSection.endOffset = markdown.length;
	}

	return mutableSections.map((section) => ({
		heading: section.heading,
		level: section.level,
		content: markdown.slice(section.startOffset, section.endOffset),
		startLine: section.startLine,
		endLine: section.endLine,
	}));
}

export function requireSection(
	markdown: string,
	heading: string,
	sourceName: string,
): MarkdownSection {
	const matching = listSections(markdown).filter(
		(section) => section.heading === heading,
	);

	if (matching.length === 0) {
		throw createError(sourceName, `missing required heading: ${heading}`);
	}

	if (matching.length > 1) {
		throw createError(sourceName, `duplicate heading: ${heading}`);
	}

	const section = matching[0];
	if (section === undefined) {
		throw createError(sourceName, `missing required heading: ${heading}`);
	}

	return section;
}

export function assertUniqueHeadings(
	sections: readonly MarkdownSection[],
	sourceName: string,
): void {
	const counts = new Map<string, number>();

	for (const section of sections) {
		counts.set(section.heading, (counts.get(section.heading) ?? 0) + 1);
	}

	for (const [heading, count] of counts) {
		if (count > 1) {
			throw createError(sourceName, `duplicate heading: ${heading}`);
		}
	}
}
