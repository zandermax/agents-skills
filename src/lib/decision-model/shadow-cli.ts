import { decideToolSafety } from "./client.js";
import {
	appendShadowRecord,
	createShadowLogRecord,
	defaultShadowLogPath,
	sessionIdFromTranscriptPath,
} from "./log.js";

const MAX_STATE_CHARS = 4000;

export interface ShadowPayload {
	readonly toolName?: string | null;
	readonly toolInput?: unknown;
	readonly hookDecision?: string | null;
	readonly hookReason?: string | null;
	readonly hookLatencyMs?: number | null;
	readonly cwd?: string | null;
	readonly transcriptPath?: string | null;
	readonly userResolution?: "deferred" | null;
}

export function boundShadowState(payload: ShadowPayload): string {
	const state = JSON.stringify({
		toolName: payload.toolName ?? null,
		toolInput: payload.toolInput ?? null,
	});
	return state.length > MAX_STATE_CHARS
		? state.slice(0, MAX_STATE_CHARS)
		: state;
}

export async function runShadowPayload(
	payload: ShadowPayload,
	options: {
		readonly fetch?: typeof fetch;
		readonly logPath?: string;
		readonly now?: () => number;
		readonly timestamp?: Date;
	} = {},
): Promise<boolean> {
	const now = options.now ?? Date.now;
	const started = now();
	const decision = await decideToolSafety(
		{ state: boundShadowState(payload) },
		options.fetch ? { fetch: options.fetch } : {},
	);
	const record = createShadowLogRecord(decision, {
		...(payload.cwd ? { cwd: payload.cwd } : {}),
		toolName: payload.toolName ?? null,
		hookDecision: payload.hookDecision ?? null,
		hookReason: payload.hookReason ?? null,
		hookLatencyMs: payload.hookLatencyMs ?? null,
		shadowLatencyMs: Math.max(0, now() - started),
		userResolution: payload.userResolution ?? "deferred",
	});

	return appendShadowRecord(
		record,
		options.logPath ??
			defaultShadowLogPath(
				sessionIdFromTranscriptPath(payload.transcriptPath),
				options.timestamp,
			),
	);
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1]?.endsWith("shadow-cli.ts")) {
	const payload = JSON.parse(await readStdin()) as ShadowPayload;
	await runShadowPayload(payload);
}
