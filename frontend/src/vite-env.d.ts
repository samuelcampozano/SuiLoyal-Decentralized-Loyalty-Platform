/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PACKAGE_ID: string;
  readonly VITE_PLATFORM_ID: string;
  readonly VITE_SUI_NETWORK: string;
  readonly VITE_SUI_FULLNODE_URL: string;
  readonly VITE_SUI_FAUCET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}