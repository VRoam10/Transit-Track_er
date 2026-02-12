'use client';
import { RefObject, useEffect, useRef, useState } from 'react';

const stationData = [
  {
    id: 'tracking',
    x: 500, y: 900,
    title: 'Live Tracking',
    desc: 'Real-time GPS positions for every bus and metro line in your city, updated every second.',
    colors: ['#017aeb', '#22c55e'],
  },
  {
    id: 'alerts',
    x: 720, y: 1500,
    title: 'Smart Alerts',
    desc: 'Schedule departure notifications so you always leave on time — no more guessing.',
    colors: ['#FF1F22', '#22c55e'],
  },
  {
    id: 'routes',
    x: 350, y: 1800,
    title: 'Saved Routes',
    desc: 'Bookmark your daily commute and access next departures instantly with one tap.',
    colors: ['#017aeb'],
  },
  {
    id: 'connectors',
    x: 900, y: 2800,
    title: 'API Connectors',
    desc: 'Plug in any European transit provider through our connector system with custom data mapping.',
    colors: ['#FF1F22', '#22c55e'],
  },
  {
    id: 'cities',
    x: 720, y: 3600,
    title: '200+ Cities',
    desc: 'Track buses and metros across Europe from a single app — Paris, Berlin, Barcelona, and more.',
    colors: ['#017aeb', '#FF1F22', '#22c55e'],
  },
];

const decoStations = [
  { x: 350, y: 400, c: '#017aeb' },
  { x: 1100, y: 300, c: '#FF1F22' },
  { x: 720, y: 200, c: '#22c55e' },
  { x: 950, y: 1100, c: '#FF1F22' },
  { x: 500, y: 1100, c: '#017aeb' },
  { x: 500, y: 2500, c: '#22c55e' },
  { x: 350, y: 1600, c: '#017aeb' },
  { x: 900, y: 2200, c: '#FF1F22' },
  { x: 850, y: 4400, c: '#017aeb' },
  { x: 600, y: 4400, c: '#FF1F22' },
  { x: 900, y: 4400, c: '#22c55e' },
];

// Compute polyline length from point pairs (avoids getTotalLength browser issues)
function calcLength(points: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

const bluePoints: [number, number][] = [
  [350, -150], [350, 800], [500, 850], [500, 1100], [350, 1250],
  [350, 2000], [500, 2150], [500, 2800], [720, 3020], [720, 3600],
  [850, 3730], [850, 5100],
];
const redPoints: [number, number][] = [
  [1100, -100], [1100, 500], [950, 650], [950, 1100], [720, 1330],
  [720, 1700], [900, 1880], [900, 2800], [720, 2980], [720, 3600],
  [600, 3720], [600, 5100],
];
const greenPoints: [number, number][] = [
  [720, -100], [720, 350], [500, 570], [500, 900], [720, 1120],
  [720, 1500], [500, 1720], [500, 2500], [720, 2720], [900, 2720],
  [900, 2800], [720, 3020], [720, 3600], [900, 3820], [900, 5100],
];

const BLUE_LEN = calcLength(bluePoints);
const RED_LEN = calcLength(redPoints);
const GREEN_LEN = calcLength(greenPoints);

function pointsToString(pts: [number, number][]): string {
  return pts.map(p => p.join(',')).join(' ');
}

export default function MetroMap({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const [active, setActive] = useState<string | null>(null);
  const blueRef = useRef<SVGPolylineElement>(null);
  const redRef = useRef<SVGPolylineElement>(null);
  const greenRef = useRef<SVGPolylineElement>(null);
  const decoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stationBtnRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close modal on click outside
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      // Check if click is inside any station button
      let inside = false;
      stationBtnRefs.current.forEach((btn) => {
        if (btn?.contains(e.target as Node)) inside = true;
      });
      if (!inside) setActive(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [active]);

  // Scroll-driven animation via direct DOM manipulation
  useEffect(() => {
    const container = scrollRef.current;
    const blue = blueRef.current;
    const red = redRef.current;
    const green = greenRef.current;
    if (!container || !blue || !red || !green) return;

    // Set dasharray once using precomputed lengths
    blue.style.strokeDasharray = `${BLUE_LEN}`;
    red.style.strokeDasharray = `${RED_LEN}`;
    green.style.strokeDasharray = `${GREEN_LEN}`;

    const update = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      const progress = maxScroll > 0 ? container.scrollTop / maxScroll : 0;

      // SVG is 5000 units tall, viewport shows 1000 units at a time.
      // At progress=0 we see y 0-1000, at progress=1 we see y 4000-5000.
      const viewBottom = progress * 4000 + 1000;

      // Draw lines up to the current viewport bottom (slight per-line stagger)
      const drawBlue = Math.min(1, (viewBottom + 100) / 5100);
      const drawRed = Math.min(1, (viewBottom - 50) / 5200);
      const drawGreen = Math.min(1, viewBottom / 5200);

      blue.style.strokeDashoffset = `${BLUE_LEN * (1 - drawBlue)}`;
      red.style.strokeDashoffset = `${RED_LEN * (1 - drawRed)}`;
      green.style.strokeDashoffset = `${GREEN_LEN * (1 - drawGreen)}`;

      // Station appears when viewport bottom reaches its y
      const isVisible = (y: number) => viewBottom >= y;

      decoRefs.current.forEach((el, i) => {
        if (!el) return;
        const vis = isVisible(decoStations[i].y);
        el.style.opacity = vis ? '1' : '0';
        el.style.transform = `translate(-50%, -50%) scale(${vis ? 1 : 0.3})`;
      });

      stationBtnRefs.current.forEach((btn, id) => {
        const s = stationData.find(st => st.id === id);
        if (!btn || !s) return;
        const vis = isVisible(s.y);
        btn.style.opacity = vis ? '1' : '0';
        btn.style.transform = `translate(-50%, -50%) scale(${vis ? 1 : 0.3})`;
      });
    };

    const onScroll = () => requestAnimationFrame(update);
    container.addEventListener('scroll', onScroll);
    update();
    return () => container.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ height: '500vh' }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 5000"
        preserveAspectRatio="none"
        fill="none"
      >
        <polyline
          ref={blueRef}
          points={pointsToString(bluePoints)}
          stroke="#017aeb"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        <polyline
          ref={redRef}
          points={pointsToString(redPoints)}
          stroke="#FF1F22"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        <polyline
          ref={greenRef}
          points={pointsToString(greenPoints)}
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
      </svg>

      {/* ===== DECORATIVE STATIONS (same style as interchange) ===== */}
      {decoStations.map((s, i) => (
        <div
          key={i}
          ref={el => { decoRefs.current[i] = el; }}
          className="absolute w-5 h-5 rounded-full bg-white border-2 border-gray-800 shadow-sm flex items-center justify-center"
          style={{
            left: `${(s.x / 1440) * 100}%`,
            top: `${(s.y / 5000) * 100}%`,
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(0.3)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.c }} />
        </div>
      ))}

      {/* ===== CLICKABLE INTERCHANGE STATIONS ===== */}
      {stationData.map((s) => (
        <button
          key={s.id}
          ref={el => { stationBtnRefs.current.set(s.id, el); }}
          className="absolute pointer-events-auto z-10 group"
          style={{
            left: `${(s.x / 1440) * 100}%`,
            top: `${(s.y / 5000) * 100}%`,
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(0.3)',
            transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onClick={() => setActive(active === s.id ? null : s.id)}
        >
          <div className={`relative w-7 h-7 rounded-full bg-white border-[3px] border-gray-800 shadow-md flex items-center justify-center transition-transform duration-200 ${active === s.id ? 'scale-150' : 'hover:scale-125'}`}>
            <div className="flex gap-[2px]">
              {s.colors.map((c, i) => (
                <div key={i} className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {active === s.id && (
            <div className="absolute left-10 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-5 w-72 border border-gray-200 dark:border-zinc-700 text-left z-50">
              <div className="flex gap-2 mb-3">
                {s.colors.map((c, i) => (
                  <div key={i} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">{s.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{s.desc}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
