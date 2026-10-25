# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky


class Plugin:
    # H0: lifecycle only. Settings (get_settings / set_setting) arrive in H1.

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
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
