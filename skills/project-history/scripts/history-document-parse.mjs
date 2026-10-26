// @ts-check

/**
 * @param {string} text
 * @param {string} heading
 * @returns {RegExpMatchArray[]}
 */
export function findSectionHeadings(text, heading) {
	const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return [...text.matchAll(new RegExp(`^## ${escaped}[ \\t]*$`, "gm"))];
}

/**
 * @param {string} text
 * @param {string} filename
 * @returns {{ status: string, log: string }}
 */
export function sectionBounds(text, filename) {
	const status = findSectionHeadings(text, "Git status");
	const logs = findSectionHeadings(text, "Log");
	if (
		status.length !== 1 ||
		logs.length !== 1 ||
		status[0].index === undefined ||
		logs[0].index === undefined ||
		status[0].index >= logs[0].index
	) {
		throw new Error(
			`${filename} must contain one '## Git status' section before one '## Log' section`,
		);
	}
	const statusStart = status[0].index + status[0][0].length;
	const logStart = logs[0].index + logs[0][0].length;
	return {
		status: text.slice(statusStart, logs[0].index),
		log: text.slice(logStart),
	};
}

/**
 * @param {string} statusSection
 * @param {string} filename
 * @returns {number}
 */
export function parseThreshold(statusSection, filename) {
	const matches = [
		...statusSection.matchAll(/^Branch warning threshold:[ \t]*(.*?)[ \t]*$/gm),
	];
	if (matches.length !== 1) {
		throw new Error(
			`${filename} must contain one Branch warning threshold field`,
		);
	}
	const raw = matches[0][1];
	if (!/^\d+$/.test(raw)) {
		throw new Error(
			`${filename} Branch warning threshold must be a nonnegative integer`,
		);
	}
	const threshold = Number(raw);
	if (!Number.isSafeInteger(threshold)) {
		throw new Error(
			`${filename} Branch warning threshold must be a nonnegative integer`,
		);
	}
	return threshold;
}

/**
 * @param {string} statusSection
 * @param {string} filename
 * @returns {string}
 */
export function readMainBranch(statusSection, filename) {
	const matches = [
		...statusSection.matchAll(/^Main branch:[ \t]*(.*?)[ \t]*$/gm),
	];
	if (matches.length !== 1) {
		throw new Error(`${filename} must contain one Main branch field`);
	}
	const mainBranch = matches[0][1].trim();
	if (!mainBranch) {
		throw new Error(`${filename} Main branch field must be a nonempty string`);
	}
	return mainBranch;
}

/**
 * @param {string} statusSection
 * @param {string} filename
 * @returns {string}
 */
export function readTimestamp(statusSection, filename) {
	const matches = [
		...statusSection.matchAll(/^Updated at:[ \t]*(.*?)[ \t]*$/gm),
	];
	if (matches.length !== 1)
		throw new Error(`${filename} must contain one Updated at field`);
	return matches[0][1];
}

/**
 * @param {unknown} value
 * @param {string} context
 * @returns {number}
 */
export function parseTimestamp(value, context) {
	if (
		typeof value !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
	) {
		throw new Error(
			`${context} must be a canonical UTC date with second precision`,
		);
	}
	const milliseconds = Date.parse(value);
	if (!Number.isFinite(milliseconds))
		throw new Error(`${context} has an invalid date`);
	try {
		if (
			new Date(milliseconds).toISOString().replace(/\.000Z$/, "Z") !== value
		) {
			throw new Error(`${context} has an impossible or noncanonical date`);
		}
	} catch {
		throw new Error(`${context} has an impossible or noncanonical date`);
	}
	return milliseconds;
}

/**
 * @param {string} section
 * @param {string} filename
 * @returns {string}
 */
export function locateJsonBlock(section, filename) {
	const lines = section.split(/\r?\n/);
	const openings = [];
	for (let index = 0; index < lines.length; index += 1) {
		if (/^```(?:jsonl?)[ \t]*$/.test(lines[index])) openings.push(index);
	}
	if (openings.length !== 1) {
		throw new Error(
			`${filename} must contain exactly one fenced json or jsonl block`,
		);
	}
	const start = openings[0];
	let end = -1;
	for (let index = start + 1; index < lines.length; index += 1) {
		if (/^```[ \t]*$/.test(lines[index])) {
			end = index;
			break;
		}
	}
	if (end < 0) throw new Error(`${filename} has an unterminated JSON block`);
	return lines.slice(start + 1, end).join("\n");
}

/**
 * @template {Record<string, any>} T
 * @param {string} section
 * @param {string} filename
 * @param {string[]} requiredFields
 * @returns {T[]}
 */
export function parseRecords(section, filename, requiredFields) {
	const blockText = locateJsonBlock(section, filename);
	const trimmed = blockText.trim();
	if (!trimmed) return [];

	/** @type {unknown[]} */
	let records;

	if (trimmed.startsWith("[")) {
		try {
			records = JSON.parse(trimmed);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`${filename} JSON block is malformed: ${message}`);
		}
		if (!Array.isArray(records)) {
			throw new Error(
				`${filename} JSON block must contain an array of objects`,
			);
		}
	} else {
		records = [];
		let pos = 0;
		while (pos < trimmed.length) {
			while (pos < trimmed.length && /\s/.test(trimmed[pos])) pos++;
			if (pos >= trimmed.length) break;
			if (trimmed[pos] !== "{") {
				throw new Error(`${filename} JSON record must be an object`);
			}
			let depth = 0;
			let inString = false;
			let isEscaped = false;
			const start = pos;
			while (pos < trimmed.length) {
				const ch = trimmed[pos];
				if (isEscaped) {
					isEscaped = false;
				} else if (ch === "\\") {
					if (inString) isEscaped = true;
				} else if (ch === '"') {
					inString = !inString;
				} else if (!inString) {
					if (ch === "{") depth++;
					else if (ch === "}") {
						depth--;
						if (depth === 0) {
							pos++;
							break;
						}
					}
				}
				pos++;
			}
			if (depth !== 0) {
				throw new Error(`${filename} JSON block has an unterminated object`);
			}
			const objText = trimmed.slice(start, pos);
			try {
				records.push(JSON.parse(objText));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`${filename} JSON record is malformed: ${message}`);
			}
		}
	}

	return records.map((record, index) => {
		const recordNumber = index + 1;
		if (!record || typeof record !== "object" || Array.isArray(record)) {
			throw new Error(
				`${filename} JSON record ${recordNumber} must be an object`,
			);
		}
		const obj = /** @type {Record<string, unknown>} */ (record);
		for (const field of requiredFields) {
			if (typeof obj[field] !== "string") {
				throw new Error(
					`${filename} JSON record ${recordNumber} field ${field} must be a string`,
				);
			}
		}
		return /** @type {T} */ (obj);
	});
}
