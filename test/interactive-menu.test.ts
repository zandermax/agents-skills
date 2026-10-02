import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
	DEFAULT_CLIENT_MENU_ITEMS,
	promptClientSelection,
	renderMenu,
} from "../src/lib/interactive-menu.js";

test("DEFAULT_CLIENT_MENU_ITEMS contains copilot, claude, and agents", () => {
	assert.deepEqual(
		DEFAULT_CLIENT_MENU_ITEMS.map((item) => item.id),
		["copilot", "claude", "agents"],
	);
});

test("renderMenu renders focus pointer and checkbox marks", () => {
	const rendered = renderMenu(
		DEFAULT_CLIENT_MENU_ITEMS,
		0,
		new Set(["copilot"]),
	);

	assert.match(rendered, /Select clients to install:/);
	assert.match(rendered, /Copilot/);
	assert.match(rendered, /Claude/);
	assert.match(rendered, /General agents/);
	// Single selection should not display duplicate entries warning
	assert.doesNotMatch(rendered, /duplicate/i);
});

test("renderMenu explains shared installation when more than one client is selected", () => {
	const rendered = renderMenu(
		DEFAULT_CLIENT_MENU_ITEMS,
		1,
		new Set(["copilot", "claude"]),
	);

	assert.match(rendered, /Shared skills and agents are installed once/i);
	assert.doesNotMatch(rendered, /duplicate/i);
});

test("promptClientSelection resolves default copilot selection on return", async () => {
	const mockInput = new EventEmitter() as EventEmitter & {
		isTTY: boolean;
		setRawMode: () => void;
		resume: () => void;
		pause: () => void;
	};
	mockInput.isTTY = false;
	mockInput.setRawMode = () => {};
	mockInput.resume = () => {};
	mockInput.pause = () => {};

	let outputData = "";
	const mockOutput = {
		write: (chunk: string) => {
			outputData += chunk;
			return true;
		},
	};

	const promptPromise = promptClientSelection({
		input: mockInput as unknown as NodeJS.ReadStream,
		output: mockOutput as unknown as NodeJS.WriteStream,
	});

	// Press return key
	mockInput.emit("keypress", "\r", { name: "return" });

	const result = await promptPromise;
	assert.deepEqual(result, ["copilot"]);
	assert.match(outputData, /Selected clients: Copilot/);
});

test("promptClientSelection supports toggling and navigating", async () => {
	const mockInput = new EventEmitter() as EventEmitter & {
		isTTY: boolean;
		setRawMode: () => void;
		resume: () => void;
		pause: () => void;
	};
	mockInput.isTTY = false;
	mockInput.setRawMode = () => {};
	mockInput.resume = () => {};
	mockInput.pause = () => {};

	let outputData = "";
	const mockOutput = {
		write: (chunk: string) => {
			outputData += chunk;
			return true;
		},
	};

	const promptPromise = promptClientSelection({
		input: mockInput as unknown as NodeJS.ReadStream,
		output: mockOutput as unknown as NodeJS.WriteStream,
	});

	// Navigate down to Claude (index 1) and toggle it on
	mockInput.emit("keypress", undefined, { name: "down" });
	mockInput.emit("keypress", " ", { name: "space" });

	assert.match(outputData, /Shared skills and agents are installed once/i);

	// Press return key
	mockInput.emit("keypress", "\r", { name: "return" });

	const result = await promptPromise;
	assert.deepEqual([...result].sort(), ["claude", "copilot"].sort());
});
