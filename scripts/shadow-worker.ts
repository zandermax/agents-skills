#!/usr/bin/env node

import { DecisionModelClient } from "../src/lib/decision-model/client.js";
import { logShadowDecision } from "../src/lib/decision-model/shadow-logger.js";

interface ShadowWorkerPayload {
	readonly toolName: string;
	readonly toolInput: unknown;
	readonly actualPermissionDecision?: "allow" | "ask" | "deny";
	readonly toolUseId?: string;
	readonly sessionId?: string;
	readonly logFilePath?: string;
}

async function main(): Promise<void> {
	const rawPayload = process.argv[2];
	if (!rawPayload) {
		return;
	}

	try {
		const payload = JSON.parse(rawPayload) as ShadowWorkerPayload;
		const client = new DecisionModelClient({ timeoutMs: 3500 });
		const result = await client.evaluateToolCall(
			payload.toolName,
			payload.toolInput,
		);
		if (result) {
			await logShadowDecision({
				toolName: payload.toolName,
				toolInput: payload.toolInput,
				result,
				actualPermissionDecision: payload.actualPermissionDecision,
				toolUseId: payload.toolUseId,
				sessionId: payload.sessionId,
				logFilePath: payload.logFilePath ?? process.env.SHADOW_LOG_PATH,
			});
		}
	} catch {
		// Non-blocking fail-safe: never throw uncaught error
	}
}

main().catch(() => {});
