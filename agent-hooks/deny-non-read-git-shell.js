/** Shell statement and token parsing helpers. */

export const SHELL_INTERPRETERS = new Set(["bash", "fish", "sh", "zsh"]);
const READ_ONLY_EXTERNAL_COMMANDS = new Set([
	"awk",
	"cat",
	"cut",
	"file",
	"grep",
	"head",
	"ls",
	"sed",
	"sort",
	"stat",
	"tail",
	"tr",
	"uniq",
	"wc",
]);

export function splitShellStatements(cmdLine) {
	const statements = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let escaped = false;

	for (let i = 0; i < cmdLine.length; i++) {
		const char = cmdLine[i];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && !inSingleQuote) {
			escaped = true;
			current += char;
			continue;
		}

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			current += char;
			continue;
		}

		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			current += char;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote) {
			if (char === "\n" || char === ";") {
				if (current.trim()) {
					statements.push(current.trim());
				}
				current = "";
				continue;
			}
			if (char === "&" || char === "|") {
				if (cmdLine[i + 1] === char) {
					if (current.trim()) {
						statements.push(current.trim());
					}
					current = "";
					i++;
					continue;
				}
				if (current.trim()) {
					statements.push(current.trim());
				}
				current = "";
				continue;
			}
		}

		current += char;
	}

	if (current.trim()) {
		statements.push(current.trim());
	}

	return statements;
}

export function tokenizeStatement(statement) {
	const tokens = [];
	let current = "";
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let escaped = false;

	for (let i = 0; i < statement.length; i++) {
		const char = statement[i];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\" && !inSingleQuote) {
			escaped = true;
			continue;
		}

		if (char === "'" && !inDoubleQuote) {
			inSingleQuote = !inSingleQuote;
			continue;
		}

		if (char === '"' && !inSingleQuote) {
			inDoubleQuote = !inDoubleQuote;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote && /\s/.test(char)) {
			if (current.length > 0) {
				tokens.push(current);
				current = "";
			}
			continue;
		}

		current += char;
	}

	if (current.length > 0) {
		tokens.push(current);
	}

	return tokens;
}

function commandName(statement) {
	const token = tokenizeStatement(statement)[0] ?? "";
	return token.split(/[\\/]/).pop() ?? "";
}

export function isReadOnlyExternalCommand(statement) {
	const tokens = tokenizeStatement(statement);
	const name = commandName(statement);
	if (!READ_ONLY_EXTERNAL_COMMANDS.has(name)) {
		return false;
	}

	if (/(^|\s)>>?(?:\s|$)/.test(statement)) {
		return false;
	}

	return !(
		name === "sed" &&
		tokens.some((token) => token === "-i" || token === "--in-place")
	);
}
