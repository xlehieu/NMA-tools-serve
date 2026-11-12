export interface MenuItem {
  label: string;
  path: string;
}
export interface MenuGroup {
  label: string;
  children: MenuItem[];
}

const MENU: MenuGroup[] = [
  {
    label: "Excel",
    children: [{ label: "Lịch báo giảng", path: "/excel/teaching-schedule" }],
  },
  {
    label: "PDF",
    children: [
      { label: "Convert", path: "/pdf/convert" },
      { label: "Copy protected file", path: "/pdf/copy-protected" },
    ],
  },
];

/** Gắn cờ active theo URL hiện tại để template khỏi phải xử lý logic */
export function buildMenu(activePath: string) {
  const currentPath = activePath === '/' || activePath === '/upload'
    ? '/pdf/convert'
    : activePath === '/copy-pdf'
      ? '/pdf/copy-protected'
      : activePath;

  return MENU.map((g) => ({
    ...g,
    children: g.children.map((c) => ({ ...c, active: c.path === currentPath })),
  }));
}
