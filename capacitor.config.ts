import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'au.com.chairbuddy.app',
  appName: 'Chair Buddy',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0b0f14',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0b0f14'
    }
  }
};

export default config;
