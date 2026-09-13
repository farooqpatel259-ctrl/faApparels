import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.faapparels.inventory",
  appName: "FA Apparels",
  // Bundled Next.js static export — app features run inside the APK
  webDir: "../web/out",
  server: {
    cleartext: true,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
