const paths = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" /></>,
  scan: <><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /><circle cx="12" cy="11" r="3" /><path d="M7.5 17c1.1-1.5 2.6-2.3 4.5-2.3s3.4.8 4.5 2.3" /></>,
  activity: <><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="7" cy="6" r="1" /><circle cx="17" cy="12" r="1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.6-4.2 3.1-6.3 7.5-6.3s6.9 2.1 7.5 6.3" /></>,
  arrow: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  shield: <><path d="M12 3 5 6v5c0 4.4 2.3 7.7 7 10 4.7-2.3 7-5.6 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></>,
  wallet: <><path d="M4 6h15v13H4z" /><path d="M4 9h15M15 13h6v4h-6z" /></>,
  store: <><path d="M4 9h16l-2-5H6L4 9Z" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  face: <><circle cx="12" cy="12" r="9" /><path d="M8.5 10h.01M15.5 10h.01M8.5 15c2.3 1.8 4.7 1.8 7 0" /></>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5h.01" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  camera: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  wifi: <><path d="M3 9a14 14 0 0 1 18 0M6 12.5a9.5 9.5 0 0 1 12 0M9 16a5 5 0 0 1 6 0M12 19.5h.01" /><path d="M4 4l16 16" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>,
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      {paths[name]}
    </svg>
  );
}
