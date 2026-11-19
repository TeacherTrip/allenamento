/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Numero della pubblicazione (GitHub Actions run_number); assente in locale. */
  readonly VITE_BUILD_NUMBER?: string;
  /** Commit pubblicato (GitHub Actions sha); assente in locale. */
  readonly VITE_COMMIT?: string;
}
