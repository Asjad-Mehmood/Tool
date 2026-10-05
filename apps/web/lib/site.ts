/** True for the static GitHub Pages build: no server, accounts, API or server-side tools. */
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === "1";
export const SITE_NAME = "ToolHub";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolhub.example";
