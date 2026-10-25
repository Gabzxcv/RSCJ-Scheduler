// One small SVG icon set so icons look the same on iPhone, iPad, and desktop
// (plain unicode symbols can turn into emoji or different glyphs on iOS).
const paths = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  invoice: <><path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" /><path d="M9 8.5h6M9 12h6" /></>,
  more: <><circle cx="5.5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18.5" cy="12" r="1.2" /></>,
  driver: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" /></>,
  vehicle: <><path d="M4 16.5V11l2-4.5h12L20 11v5.5" /><path d="M3.5 16.5h17V19h-3v-1.5h-11V19h-3z" /><path d="M4 11h16" /></>,
  history: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  reports: <><path d="M5 20V10M12 20V4M19 20v-7" /></>,
  team: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19.5c.5-3 2.8-4.6 5.5-4.6s5 1.6 5.5 4.6" /><path d="M16 5.8a3 3 0 0 1 0 5.4M17.5 15.2c1.7.5 2.8 1.9 3 4.3" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8M12 17h.01" /></>,
  bell: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  phone: <path d="M5 4.5h3.5l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.5 1.5A15.5 15.5 0 0 1 3.5 6 1.5 1.5 0 0 1 5 4.5z" />,
  map: <><path d="M12 21s6.5-5.4 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 15.6 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.3" /></>,
  share: <><path d="M12 15V4M8 7.5 12 3.5l4 4" /><path d="M6 11.5H5v8h14v-8h-1" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  list: <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
