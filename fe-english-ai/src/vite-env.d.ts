/// <reference types="vite/client" />

// Add custom environment variables here so TypeScript knows about them
interface ImportMetaEnv {
	readonly VITE_API_URL: string;
	// more env vars...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
