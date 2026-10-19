import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.galaya.cashout',
  appName: 'galaya-cash-out',
  webDir: 'dist',
  plugins: {
    // Updates are driven by src/lib/appUpdateRuntime.ts, not the Capgo cloud.
    CapacitorUpdater: { autoUpdate: false },
  },
};

export default config;
