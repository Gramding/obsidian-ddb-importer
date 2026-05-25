import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			// Codebase uses inline styles throughout for dynamic Obsidian UI
			"obsidianmd/no-static-styles-assignment": "off",
			// innerHTML used deliberately for performance in renderer blocks
			"@microsoft/sdl/no-inner-html": "off",
			// Dynamic Obsidian/DnD Beyond API data requires any types
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			// Fire-and-forget async calls in event handlers
			"@typescript-eslint/no-floating-promises": "off",
			// Non-null assertions used where initialisation is guaranteed
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
			// UI text style choices
			"obsidianmd/settings-tab/no-manual-html-headings": "off",
			"obsidianmd/ui/sentence-case": "off",
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"tests/**",
		"vitest.config.ts",
	]),
);
