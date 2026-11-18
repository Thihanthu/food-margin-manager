export const APP_SETTINGS_KEY = "biz:app-settings";

export type AppSettings = {
  appName: string;
  subtitle: string;
  logo: string;
  primary: string;
  accent: string;
  background: string;
};

export const defaultAppSettings: AppSettings = {
  appName: "စားသောက်ဆိုင် စာရင်းစနစ်",
  subtitle: "Restaurant Ledger",
  logo: "",
  primary: "#8f4a32",
  accent: "#e6b95c",
  background: "#f7f3ea",
};

export function loadAppSettings(): AppSettings {
  try {
    const saved = JSON.parse(
      localStorage.getItem(APP_SETTINGS_KEY) ?? "{}",
    ) as Partial<AppSettings>;
    return { ...defaultAppSettings, ...saved };
  } catch {
    return { ...defaultAppSettings };
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  applyAppSettings(settings);
  window.dispatchEvent(new Event("app:settings-changed"));
}

export function applyAppSettings(settings: AppSettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", settings.primary);
  root.style.setProperty("--accent", settings.accent);
  root.style.setProperty("--background", settings.background);
  root.style.setProperty("--ring", settings.primary);
  root.style.setProperty("--card", "#fffdf8");
  root.style.setProperty("--card-foreground", "#352f29");
}
