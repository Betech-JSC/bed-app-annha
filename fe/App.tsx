import 'expo-router/entry';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://2bd727c72523995c524d76c5ca749c30@o4510345327280128.ingest.us.sentry.io/4510345329639434',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,
  enableNative: true,
  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});
