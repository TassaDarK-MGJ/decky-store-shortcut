# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import json
import os

import decky

# Settings (design 9.1). src/settings/schema.ts mirrors this. Unknown keys are rejected.
SCHEMA = {
    "menu_item_enabled": {"type": bool, "default": True},
    "shortcut_button": {"type": str, "default": "l3", "choices": ("off", "l3", "r3")},
    "show_footer_hint": {"type": bool, "default": True},
    "unavailable_feedback": {"type": bool, "default": True},
    "language": {"type": str, "default": "auto", "choices": ("auto", "en", "fr", "es", "it", "de")},
    "debug_logging": {"type": bool, "default": False},
}

SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")


def _valid(key, value):
    spec = SCHEMA[key]
    if type(value) is not spec["type"]:
        return False
    return value in spec.get("choices", (value,))


def _defaults():
    return {key: spec["default"] for key, spec in SCHEMA.items()}


class Plugin:
    settings = None

    def _current(self):
        # get_settings may arrive before _main has run.
        if self.settings is None:
            self.settings = self._load()
        return self.settings

    def _load(self):
        settings = _defaults()
        try:
            with open(SETTINGS_FILE, encoding="utf-8") as f:
                stored = json.load(f)
        except FileNotFoundError:
            return settings
        except (OSError, ValueError) as e:
            decky.logger.warning(f"[StoreShortcut] unreadable settings, using defaults: {e}")
            return settings
        if isinstance(stored, dict):
            for key, value in stored.items():
                if key in SCHEMA and _valid(key, value):
                    settings[key] = value
        return settings

    def _save(self):
        os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
        tmp = SETTINGS_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.settings, f, indent=2)
        os.replace(tmp, SETTINGS_FILE)

    async def get_settings(self):
        return dict(self._current())

    async def set_setting(self, key, value):
        if key not in SCHEMA:
            raise ValueError(f"unknown setting: {key}")
        if not _valid(key, value):
            raise ValueError(f"invalid value for {key}: {value!r}")
        self._current()[key] = value
        self._save()
        decky.logger.info(f"[StoreShortcut] {key} = {value!r}")
        return dict(self.settings)

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        self._current()
        decky.logger.info("[StoreShortcut] backend started")

    # Function called first during the unload process, utilize this to handle your plugin being stopped, but not
    # completely removed
    async def _unload(self):
        decky.logger.info("[StoreShortcut] backend stopped")

    # Function called after `_unload` during uninstall, utilize this to clean up processes and other remnants of your
    # plugin that may remain on the system
    async def _uninstall(self):
        decky.logger.info("[StoreShortcut] uninstalled")

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        pass
