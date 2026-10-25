// Quick health check of the CDP environment (S0.1 subset) and installed probes.
(async () => ({
  dfl: typeof window.DFL,
  href: location.href,
  probes: Object.keys(window.__storeShortcutProbes ?? {}),
  lang: await SteamClient.Settings.GetCurrentLanguage().catch((e) => "error: " + e),
}))();
