import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildSkills } from '../src/build-skills.js';

type SkillOptions = {
	invalidManifest?: boolean;
};

async function createTempRepo(): Promise<string> {
	return mkdtemp(path.join(os.tmpdir(), 'build-skills-task6-'));
}

function skillOutputPath(repoRoot: string, skillName: string): string {
	return path.join(repoRoot, '.agents', 'skills', skillName, 'SKILL.md');
}

function createManifest(skillName: string, options: SkillOptions = {}): string {
	if (options.invalidManifest) {
		return JSON.stringify(
			{
				name: skillName,
				title: `${skillName} Skill`,
				description: `Use when ${skillName} requires deterministic planning.`,
				output: `.agents/skills/${skillName}/SKILL.md`,
				selections: [
					{
						source: 'missing.md',
						owner: 'core',
						headings: ['Scope'],
					},
				],
				sectionOwnership: {
					Scope: 'core',
				},
				requiredPhrases: [],
				forbiddenPhrases: [],
			},
			null,
			2,
		);
	}

	return JSON.stringify(
		{
			name: skillName,
			title: `${skillName} Skill`,
			description: `Use when ${skillName} requires deterministic planning.`,
			output: `.agents/skills/${skillName}/SKILL.md`,
			selections: [
				{
					source: 'core.md',
					owner: 'core',
					headings: ['Scope'],
				},
				{
					source: 'official.md',
					owner: 'official',
					headings: ['Discovery'],
					transforms: 'transforms.json',
				},
				{
					source: 'skill-only.md',
					owner: 'skill',
					headings: ['Usage'],
				},
			],
			sectionOwnership: {
				Scope: 'core',
				Discovery: 'official',
				Usage: 'skill',
			},
			requiredPhrases: ['canonical state record'],
			forbiddenPhrases: ['/memories/session/plan.md'],
		},
		null,
		2,
	);
}

async function writeSkillSource(
	repoRoot: string,
	skillName: string,
	options: SkillOptions = {},
): Promise<void> {
	const sourceDir = path.join(repoRoot, 'sources', skillName);
	await mkdir(sourceDir, { recursive: true });
	await writeFile(
		path.join(sourceDir, 'core.md'),
		'## Scope\nMaintain a canonical state record for each phase.\n',
		'utf8',
	);
	await writeFile(
		path.join(sourceDir, 'official.md'),
		[
			'---',
			'name: Official Plan Snapshot',
			'---',
			'## Discovery',
			'Use the discovery loop from VS Code guidance.',
		].join('\n'),
		'utf8',
	);
	await writeFile(
		path.join(sourceDir, 'skill-only.md'),
		'## Usage\nRun focused checkpoints and report concise updates.\n',
		'utf8',
	);
	await writeFile(
		path.join(sourceDir, 'transforms.json'),
		JSON.stringify(
			[
				{
					id: 'replace-vscode',
					operation: 'replace',
					search: 'VS Code',
					replacement: 'editor',
					expectedCount: 1,
				},
			],
			null,
			2,
		),
		'utf8',
	);
	await writeFile(
		path.join(sourceDir, 'skill.json'),
		createManifest(skillName, options),
		'utf8',
	);
}

async function setupRepoWithSkills(
	skillNames: readonly string[],
	optionsBySkill: Readonly<Record<string, SkillOptions>> = {},
): Promise<string> {
	const repoRoot = await createTempRepo();

	for (const skillName of skillNames) {
		await writeSkillSource(repoRoot, skillName, optionsBySkill[skillName]);
	}

	return repoRoot;
}

test('buildSkills discovers only sources/*/skill.json paths lexically', async () => {
	const repoRoot = await setupRepoWithSkills(['alpha']);

	await mkdir(path.join(repoRoot, 'sources', 'alpha', 'nested'), {
		recursive: true,
	});
	await writeFile(
		path.join(repoRoot, 'sources', 'alpha', 'nested', 'skill.json'),
		'{"invalid": true}',
		'utf8',
	);
	await writeFile(
		path.join(repoRoot, 'sources', 'skill.json'),
		'{"invalid": true}',
		'utf8',
	);

	try {
		const artifacts = await buildSkills({
			repoRoot,
			mode: 'write',
		});

		assert.equal(artifacts.length, 1);
		assert.equal(artifacts[0]?.path, '.agents/skills/alpha/SKILL.md');
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test('buildSkills orders discovered manifests by code-point lexical order', async () => {
	const repoRoot = await setupRepoWithSkills(['alpha-sort', 'beta-sort']);

	await rm(path.join(repoRoot, 'sources', 'a-folder'), {
		recursive: true,
		force: true,
	});
	await rm(path.join(repoRoot, 'sources', 'B-folder'), {
		recursive: true,
		force: true,
	});
	await mkdir(path.join(repoRoot, 'sources', 'a-folder'), { recursive: true });
	await mkdir(path.join(repoRoot, 'sources', 'B-folder'), { recursive: true });

	const alphaSource = path.join(repoRoot, 'sources', 'alpha-sort');
	const betaSource = path.join(repoRoot, 'sources', 'beta-sort');
	const alphaTarget = path.join(repoRoot, 'sources', 'a-folder');
	const betaTarget = path.join(repoRoot, 'sources', 'B-folder');

	for (const filename of [
		'core.md',
		'official.md',
		'skill-only.md',
		'transforms.json',
		'skill.json',
	]) {
		const alphaContent = await readFile(
			path.join(alphaSource, filename),
			'utf8',
		);
		await writeFile(path.join(alphaTarget, filename), alphaContent, 'utf8');

		const betaContent = await readFile(path.join(betaSource, filename), 'utf8');
		await writeFile(path.join(betaTarget, filename), betaContent, 'utf8');
	}

	await rm(alphaSource, { recursive: true, force: true });
	await rm(betaSource, { recursive: true, force: true });

	try {
		const artifacts = await buildSkills({
			repoRoot,
			mode: 'write',
		});

		assert.deepEqual(
			artifacts.map((artifact) => artifact.path),
			[
				'.agents/skills/beta-sort/SKILL.md',
				'.agents/skills/alpha-sort/SKILL.md',
			],
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test('buildSkills writes two valid skills and is idempotent', async () => {
	const repoRoot = await setupRepoWithSkills(['alpha', 'beta']);

	try {
		const first = await buildSkills({ repoRoot, mode: 'write' });
		assert.equal(first.length, 2);
		assert.deepEqual(
			first.map((artifact) => artifact.path),
			['.agents/skills/alpha/SKILL.md', '.agents/skills/beta/SKILL.md'],
		);
		assert.deepEqual(
			first.map((artifact) => artifact.changed),
			[true, true],
		);

		const second = await buildSkills({ repoRoot, mode: 'write' });
		assert.deepEqual(
			second.map((artifact) => artifact.changed),
			[false, false],
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test('buildSkills check mode reports missing and changed output paths', async () => {
	const repoRoot = await setupRepoWithSkills(['alpha', 'beta']);

	try {
		await buildSkills({ repoRoot, mode: 'write' });
		await rm(skillOutputPath(repoRoot, 'alpha'), { force: true });
		await writeFile(skillOutputPath(repoRoot, 'beta'), 'stale', 'utf8');

		await assert.rejects(
			async () => buildSkills({ repoRoot, mode: 'check' }),
			(error: unknown) => {
				const message = String(error);
				assert.match(message, /\.agents\/skills\/alpha\/SKILL\.md/);
				assert.match(message, /missing/i);
				assert.match(message, /\.agents\/skills\/beta\/SKILL\.md/);
				assert.match(message, /changed/i);
				return true;
			},
		);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test('buildSkills check mode passes with exact generated output', async () => {
	const repoRoot = await setupRepoWithSkills(['alpha']);

	try {
		await buildSkills({ repoRoot, mode: 'write' });
		const artifacts = await buildSkills({ repoRoot, mode: 'check' });

		assert.equal(artifacts.length, 1);
		assert.equal(artifacts[0]?.changed, false);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});

test('buildSkills validates all manifests before writing any output', async () => {
	const repoRoot = await setupRepoWithSkills(['alpha', 'beta'], {
		beta: { invalidManifest: true },
	});

	try {
		await assert.rejects(
			async () => buildSkills({ repoRoot, mode: 'write' }),
			(error: unknown) => {
				const message = String(error);
				assert.match(message, /beta\/skill\.json/);
				assert.match(message, /missing\.md/);
				return true;
			},
		);

		const alphaExists = await readFile(
			skillOutputPath(repoRoot, 'alpha'),
			'utf8',
		).then(
			() => true,
			() => false,
		);
		assert.equal(alphaExists, false);
	} finally {
		await rm(repoRoot, { recursive: true, force: true });
	}
});
