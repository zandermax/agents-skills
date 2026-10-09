import { parentPort, workerData } from "node:worker_threads";
import { countOccurrences, type OccurrenceOptions } from "../lib/text.ts";

const input = workerData as {
	text: string;
	needle: string;
	options: OccurrenceOptions;
};
try {
	parentPort?.postMessage({
		count: countOccurrences(input.text, input.needle, input.options),
	});
} catch (error) {
	parentPort?.postMessage({
		error: (error instanceof Error ? error.message : "Regex failed").slice(
			0,
			512,
		),
	});
} finally {
	parentPort?.close();
}
