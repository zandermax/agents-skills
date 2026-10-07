/**
 * Workspace boundary policy module for pre-tool safety checks.
 *
 * Wraps path checks by forwarding command strings and structured tool inputs to checkCommandPaths
 * and checkToolInputPaths in deny-non-read-git.js.
 *
 * deny-non-read-git.js validates that all accessed paths reside within recognized workspace roots,
 * permitting known safe external read locations while flagging unauthorized external file reads or writes.
 */
import { checkCommandPaths, checkToolInputPaths } from "./deny-non-read-git.js";

export { checkCommandPaths, checkToolInputPaths };

export function checkWorkspacePolicy(command, context = {}) {
	return checkCommandPaths(command, context);
}
