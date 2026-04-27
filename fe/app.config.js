const bundleId = process.env.APP_BUNDLE_ID || "com.annha.app";
const androidPackage = process.env.APP_PACKAGE || "com.annha.app";

export default {
  expo: {
    name: "Annha JSC",
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
        NSCameraUsageDescription: "Ứng dụng cần quyền truy cập Camera để chụp ảnh minh chứng nghiệm thu công trình và ghi nhận lỗi tại hiện trường.",
        NSPhotoLibraryUsageDescription: "Ứng dụng cần quyền truy cập Thư viện ảnh để tải lên các tài liệu, ảnh minh chứng nghiệm thu và báo cáo sự cố.",
      },
      usesNonExemptEncryption: false,
      config: {
        usesPushNotifications: true,
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
