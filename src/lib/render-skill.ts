import { renderFrontmatter } from "./frontmatter.js";
import type { SectionOwner, SkillManifest } from "./manifests.js";
import { listSections } from "./markdown-sections.js";

export interface OwnedSection {
	readonly owner: SectionOwner;
	readonly heading: string;
	readonly content: string;
	readonly sourceName: string;
}

export interface RenderedSkill {
	readonly path: string;
	readonly content: string;
}

const MAX_DESCRIPTION_LENGTH = 1024;
const MAINTENANCE_NOTICE_PHRASES = [
	"maintenance notice",
	"do not edit",
	"generated file",
	"auto-generated",
];

function createRenderError(message: string): Error {
	return new Error(`renderSkill: ${message}`);
}

export function renderSkill(
	manifest: SkillManifest,
	sections: readonly OwnedSection[],
): RenderedSkill {
	if (manifest.description.length > MAX_DESCRIPTION_LENGTH) {
		throw createRenderError(
			`description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
		);
	}

	const selectedHeadings: string[] = [];
	const selectedHeadingSet = new Set<string>();

	for (const selection of manifest.selections) {
		for (const heading of selection.headings) {
			if (selectedHeadingSet.has(heading)) {
				throw createRenderError(`duplicate selected heading: ${heading}`);
			}

			selectedHeadingSet.add(heading);
			selectedHeadings.push(heading);
		}
	}

	const ownershipHeadings = Object.keys(manifest.sectionOwnership);
	for (const heading of selectedHeadings) {
		if (manifest.sectionOwnership[heading] === undefined) {
			throw createRenderError(
				`section ownership is missing heading: ${heading}`,
			);
		}
	}

	for (const heading of ownershipHeadings) {
		if (!selectedHeadingSet.has(heading)) {
			throw createRenderError(
				`section ownership includes unselected heading: ${heading}`,
			);
		}
	}

	const sectionsByHeading = new Map<string, OwnedSection>();
	for (const section of sections) {
		if (sectionsByHeading.has(section.heading)) {
			throw createRenderError(`duplicate provided heading: ${section.heading}`);
		}

		if (!selectedHeadingSet.has(section.heading)) {
			throw createRenderError(
				`provided heading is not selected: ${section.heading}`,
			);
		}

		const expectedOwner = manifest.sectionOwnership[section.heading];
		if (expectedOwner !== section.owner) {
			throw createRenderError(
				`section ownership mismatch for ${section.heading}; expected ${expectedOwner} but found ${section.owner}`,
			);
		}

		sectionsByHeading.set(section.heading, section);
	}

	for (const heading of selectedHeadings) {
		if (!sectionsByHeading.has(heading)) {
			throw createRenderError(
				`missing rendered section for heading: ${heading}`,
			);
		}
	}

	const orderedSectionContent = selectedHeadings.map((heading) => {
		const section = sectionsByHeading.get(heading);
		if (section === undefined) {
			throw createRenderError(
				`missing rendered section for heading: ${heading}`,
			);
		}

		return section.content;
	});

	const frontmatter = renderFrontmatter({
		name: manifest.name,
		description: manifest.description,
	});

	const renderedContent = `${frontmatter}# Executable Planning\n\n${orderedSectionContent.join("\n\n")}`;

	const h1Count = listSections(renderedContent).filter(
		(section) => section.level === 1,
	).length;
	if (h1Count !== 1) {
		throw createRenderError(
			`final output must contain exactly one H1, found ${h1Count}`,
		);
	}

	for (const phrase of manifest.requiredPhrases) {
		if (!renderedContent.includes(phrase)) {
			throw createRenderError(`missing required phrase: ${phrase}`);
		}
	}

	for (const phrase of manifest.forbiddenPhrases) {
		if (renderedContent.includes(phrase)) {
			throw createRenderError(`forbidden phrase present: ${phrase}`);
		}
	}

	const lowercaseContent = renderedContent.toLowerCase();
	for (const phrase of MAINTENANCE_NOTICE_PHRASES) {
		if (lowercaseContent.includes(phrase)) {
			throw createRenderError(
				`maintenance notice phrase is not allowed: ${phrase}`,
			);
		}
	}

	return {
		path: manifest.output,
		content: renderedContent,
	};
}
