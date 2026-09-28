export function formatDateTimeSlug(date?: Date): string;

export function resolveShadowLogPath(
	sessionId?: string,
	baseDir?: string,
): string;

export function recordToolExecution(
	data: unknown,
	customLogPath?: string,
): void;

export function runCli(): void;
