import { checkCommandPaths, checkToolInputPaths } from "./deny-non-read-git.js";

export { checkCommandPaths, checkToolInputPaths };

export function checkWorkspacePolicy(command) {
	return checkCommandPaths(command);
}
