import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WAZA_DOCS_URL = "https://microsoft.github.io/waza/";

export function findWazaBinary(): string | null {
	const pathEnv = process.env.PATH ?? "";
	const extensions =
		process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
	for (const dir of pathEnv.split(path.delimiter)) {
		if (!dir) {
			continue;
		}
		for (const extension of extensions) {
			const fullPath = path.join(dir, `waza${extension}`);
			try {
				fs.accessSync(fullPath, fs.constants.X_OK);
				return fullPath;
			} catch {
				// Continue search
			}
		}
	}
	return null;
}

export function runWaza(arguments_: readonly string[]): Promise<number> {
	const wazaPath = findWazaBinary();
	if (!wazaPath) {
		console.error(
			`Error: Waza CLI is not installed or not found on PATH.\nTo install Waza, visit: ${WAZA_DOCS_URL}`,
		);
		return Promise.resolve(1);
	}

	return new Promise((resolve) => {
		const child = spawn(wazaPath, arguments_, {
			stdio: "inherit",
		});

		child.on("error", (error) => {
			console.error(`Failed to start waza process: ${error.message}`);
			resolve(1);
		});

		child.on("close", (code) => {
			resolve(code ?? 0);
		});
	});
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runWaza(process.argv.slice(2)).then((code) => {
		process.exitCode = code;
	});
}
