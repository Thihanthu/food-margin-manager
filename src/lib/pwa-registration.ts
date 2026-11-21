export function isPreviewHost(host: string) {
  return (
    (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host) &&
      (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(host.split(".")[0] ?? "") ||
        /^project--.+-dev$/.test(host.split(".")[0] ?? ""))) ||
    /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(host)
  );
}
export async function registerOfflineApp() {
  if (!("serviceWorker" in navigator)) return;
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname.toLowerCase()) ||
    new URLSearchParams(window.location.search).get("sw") === "off";
  if (refused) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((r) =>
          [r.active, r.waiting, r.installing].some(
            (w) => w && new URL(w.scriptURL).pathname === "/sw.js",
          ),
        )
        .map((r) => r.unregister()),
    );
    return;
  }
  await navigator.serviceWorker.register("/sw.js");
}
