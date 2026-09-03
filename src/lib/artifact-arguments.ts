export interface AgentDirectoryArgument {
	readonly collection: string;
	readonly directory: string;
}

export interface ParsedArtifactArguments {
	readonly clients: readonly string[];
	readonly skillDirectories: readonly string[];
	readonly agentDirectories: readonly AgentDirectoryArgument[];
	readonly skills: readonly string[];
	readonly agents: readonly string[];
	readonly listOnly: boolean;
	readonly hasDestinationArguments: boolean;
}

export function parseArtifactArguments(
	arguments_: readonly string[],
): ParsedArtifactArguments {
	const clients = new Set<string>();
	const skillDirectories = new Set<string>();
	const agentDirectories = new Map<string, string>();
	const skills = new Set<string>();
	const agents = new Set<string>();
	let listOnly = false;
	let hasDestinationArguments = false;

	for (let i = 0; i < arguments_.length; i += 1) {
		const arg = arguments_[i];
		if (arg === undefined) {
			throw new Error("argument index is unexpectedly missing");
		}

		if (arg === "--list") {
			listOnly = true;
		} else if (arg === "--client") {
			const value = arguments_[i + 1];
			if (value === undefined) {
				throw new Error("--client requires a value");
			}
			hasDestinationArguments = true;
			i += 1;
			clients.add(value);
		} else if (arg === "--skills-dir") {
			const value = arguments_[i + 1];
			if (value === undefined) {
				throw new Error("--skills-dir requires a value");
			}
			hasDestinationArguments = true;
			i += 1;
			const [format, path] = value.split("=");
			if (!format || format.length === 0) {
				throw new Error(
					"--skills-dir requires format=path (format part empty)",
				);
			}
			if (!path || path.length === 0) {
				throw new Error("--skills-dir requires format=path (path part empty)");
			}
			skillDirectories.add(path);
		} else if (arg === "--agents-dir") {
			const value = arguments_[i + 1];
			if (value === undefined) {
				throw new Error("--agents-dir requires a value");
			}
			hasDestinationArguments = true;
			i += 1;
			const [format, path] = value.split("=");
			if (!format || format.length === 0) {
				throw new Error(
					"--agents-dir requires format=path (format part empty)",
				);
			}
			if (!path || path.length === 0) {
				throw new Error("--agents-dir requires format=path (path part empty)");
			}
			agentDirectories.set(format, path);
		} else if (arg === "--skill") {
			const value = arguments_[i + 1];
			if (value === undefined) {
				throw new Error("--skill requires a value");
			}
			i += 1;
			skills.add(value);
		} else if (arg === "--agent") {
			const value = arguments_[i + 1];
			if (value === undefined) {
				throw new Error("--agent requires a value");
			}
			i += 1;
			agents.add(value);
		} else if (arg.startsWith("--")) {
			throw new Error(
				`${arg} is an unknown flag; use npm run install:artifacts -- --help`,
			);
		}
	}

	if (
		listOnly &&
		(clients.size > 0 ||
			skillDirectories.size > 0 ||
			agentDirectories.size > 0 ||
			skills.size > 0 ||
			agents.size > 0)
	) {
		throw new Error(
			"--list is exclusive with --client, --skills-dir, --agents-dir, --skill, and --agent",
		);
	}

	return {
		clients: Array.from(clients),
		skillDirectories: Array.from(skillDirectories),
		agentDirectories: Array.from(
			agentDirectories,
			([collection, directory]) => ({
				collection,
				directory,
			}),
		),
		skills: Array.from(skills),
		agents: Array.from(agents),
		listOnly,
		hasDestinationArguments,
	};
}
