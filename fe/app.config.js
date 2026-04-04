const bundleId = process.env.APP_BUNDLE_ID || "com.toannguyen112.annha";
const androidPackage = process.env.APP_PACKAGE || "com.toannguyen112.annha";

export default {
  expo: {
    name: "Annha",
    scheme: "Annha",
    slug: "annha",
    version: "1.0.0",
    projectId: "ca200ae2-7bff-40bc-8e90-34ebe47bbbd5",
    updates: {
      enabled: true,
      fallbackToCacheTimeout: 0,
    },
    jsEngine: "hermes",
    web: {
      favicon: "./assets/favicon.png",
    },
    experiments: {
      tsconfigPaths: true,
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#ffffff",
          defaultChannel: "default",
          enableBackgroundRemoteNotifications: true,
          sounds: ["./assets/noti.wav"],
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "skysend",
          organization: "betech-gg",
        },
      ],
    ],
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleId,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      usesNonExemptEncryption: false,
      config: {
        usesPushNotifications: true,
        googleSignIn: {
          reservedClientId: "YOUR_IOS_REVERSED_CLIENT_ID",
        },
      },
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: androidPackage,
      googleServicesFile: "./google-services.json",
    },
    extra: {
      router: {},
      eas: {
        projectId: "ca200ae2-7bff-40bc-8e90-34ebe47bbbd5",
      },
    },
    owner: "toannguyen112",
  },
};
