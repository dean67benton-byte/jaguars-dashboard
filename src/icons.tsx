// Inline line icons, 24px grid, stroke follows currentColor.
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true } as const;

export const IconHome = () => (<svg {...base}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /></svg>);
export const IconCalendar = () => (<svg {...base}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>);
export const IconBrief = () => (<svg {...base}><path d="M6 3.5h9l3.5 3.5v13.5H6z" /><path d="M14.5 3.5V7h4M9 12h6M9 15.5h6M9 8.5h2.5" /></svg>);
export const IconTeam = () => (<svg {...base}><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.8.6 3 2.2 3.4 4.7" /></svg>);
export const IconNews = () => (<svg {...base}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M7 8.5h10M7 12h10M7 15.5h6" /></svg>);
export const IconGear = () => (<svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></svg>);
export const IconRefresh = () => (<svg {...base}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4.5V11h-6.5" /></svg>);
export const IconRadio = () => (<svg {...base}><circle cx="12" cy="12" r="2" /><path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4" /></svg>);
export const Chevron = () => (<svg {...base} class="chev" width="18" height="18"><path d="m9 6 6 6-6 6" /></svg>);
