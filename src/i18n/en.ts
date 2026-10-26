export const en = {
  menu_item: "Go to store page",
  panel_menu_item: "Context menu entry",
  panel_menu_item_desc: "Adds \"Go to store page\" to the menu of library games",
  panel_language: "Language",
  panel_language_auto: "Automatic (Steam)",
  panel_debug: "Debug logging",
  panel_debug_desc: "Verbose [StoreShortcut] lines in the Steam console",
  status_title: "Status",
  status_menu_active: "Context menu: active",
  status_menu_disabled: "Context menu: turned off",
  status_menu_unavailable: "Context menu: unavailable ({reason})",
};

export type Strings = typeof en;
export type StringKey = keyof Strings;
