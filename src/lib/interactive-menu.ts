import readline from "node:readline";

export interface ClientMenuItem {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
}

export const DEFAULT_CLIENT_MENU_ITEMS: readonly ClientMenuItem[] =
	Object.freeze([
		{ id: "copilot", label: "Copilot", description: "skills, agents, hooks" },
		{ id: "claude", label: "Claude", description: "skills" },
		{
			id: "agents",
			label: "General agents",
			description: ".agents: skills, hooks",
		},
	]);

export function renderMenu(
	items: readonly ClientMenuItem[],
	cursorIndex: number,
	selectedIds: ReadonlySet<string>,
): string {
	const lines: string[] = [
		"\x1b[1mSelect clients to install:\x1b[0m",
		"\x1b[90m(Use \u2191/\u2193 to navigate, [Space] to toggle, [Enter] to confirm)\x1b[0m",
		"",
	];

	for (let i = 0; i < items.length; i += 1) {
		const item = items[i];
		if (item === undefined) {
			continue;
		}
		const isFocused = i === cursorIndex;
		const isSelected = selectedIds.has(item.id);

		const pointer = isFocused ? "\x1b[36m\u276F\x1b[0m " : "  ";
		const checkbox = isSelected
			? "\x1b[32m[\u25CF]\x1b[0m"
			: "\x1b[90m[ ]\x1b[0m";
		const label = isFocused ? `\x1b[1m${item.label}\x1b[0m` : item.label;
		const description = item.description
			? ` \x1b[90m(${item.description})\x1b[0m`
			: "";

		lines.push(`${pointer}${checkbox} ${label}${description}`);
	}

	lines.push("");
	if (selectedIds.size > 1) {
		lines.push(
			"\x1b[33m\u26A0\uFE0F  Warning: Selecting multiple clients may duplicate entries in VS Code.\x1b[0m",
		);
	} else {
		lines.push("");
	}

	return lines.join("\n");
}

export interface PromptClientSelectionOptions {
	readonly items?: readonly ClientMenuItem[];
	readonly input?: NodeJS.ReadStream;
	readonly output?: NodeJS.WriteStream;
}

export async function promptClientSelection(
	options: PromptClientSelectionOptions = {},
): Promise<readonly string[]> {
	const items = options.items ?? DEFAULT_CLIENT_MENU_ITEMS;
	const input = options.input ?? process.stdin;
	const output = options.output ?? process.stdout;

	return new Promise<readonly string[]>((resolve) => {
		let cursorIndex = 0;
		const selectedIds = new Set<string>(["copilot"]);
		let lineCount = 0;

		const render = (firstTime = false) => {
			const text = renderMenu(items, cursorIndex, selectedIds);
			const lines = text.split("\n");
			if (!firstTime) {
				readline.cursorTo(output, 0);
				readline.moveCursor(output, 0, -lineCount);
				readline.clearScreenDown(output);
			}
			output.write(`${text}\n`);
			lineCount = lines.length;
		};

		// Hide cursor
		output.write("\x1b[?25l");

		const cleanup = () => {
			output.write("\x1b[?25h");
			if (input.isTTY && typeof input.setRawMode === "function") {
				input.setRawMode(false);
			}
			input.pause();
			input.removeListener("keypress", onKeypress);
		};

		const onKeypress = (
			_str: string | undefined,
			key: readline.Key | undefined,
		) => {
			if (key === undefined) {
				return;
			}
			if (key.ctrl && key.name === "c") {
				cleanup();
				process.exit(130);
			}
			if (key.name === "up" || key.name === "k") {
				cursorIndex = (cursorIndex - 1 + items.length) % items.length;
				render();
			} else if (key.name === "down" || key.name === "j") {
				cursorIndex = (cursorIndex + 1) % items.length;
				render();
			} else if (key.name === "space") {
				const currentItem = items[cursorIndex];
				if (currentItem !== undefined) {
					if (selectedIds.has(currentItem.id)) {
						selectedIds.delete(currentItem.id);
					} else {
						selectedIds.add(currentItem.id);
					}
					render();
				}
			} else if (key.name === "return") {
				if (selectedIds.size === 0) {
					return;
				}
				cleanup();
				readline.cursorTo(output, 0);
				readline.moveCursor(output, 0, -lineCount);
				readline.clearScreenDown(output);
				const selectedLabels = items
					.filter((item) => selectedIds.has(item.id))
					.map((item) => item.label)
					.join(", ");
				output.write(
					`\x1b[32m\u2714\x1b[0m Selected clients: ${selectedLabels}\n\n`,
				);
				resolve(Array.from(selectedIds));
			}
		};

		readline.emitKeypressEvents(input);
		if (input.isTTY && typeof input.setRawMode === "function") {
			input.setRawMode(true);
		}
		input.resume();
		input.on("keypress", onKeypress);

		render(true);
	});
}
