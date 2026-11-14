// The Milo cloud mascot — the smiling cumulus from foundable.com, drawn as
// inline SVG so it renders instantly and needs no external asset.

export function MiloCloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 122 94" className={className} role="img" aria-label="Milo, the smiling cloud">
      <defs>
        <radialGradient id="miloBody" cx="42%" cy="34%" r="78%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="62%" stopColor="#fbfcff" />
          <stop offset="100%" stopColor="#e2e9f4" />
        </radialGradient>
        <filter id="miloSoft" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#2c5c9e" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#miloSoft)">
        {/* three lobes + belly, the classic cumulus silhouette */}
        <circle cx="44" cy="42" r="27" fill="url(#miloBody)" />
        <circle cx="72" cy="31" r="25" fill="url(#miloBody)" />
        <circle cx="98" cy="48" r="18" fill="url(#miloBody)" />
        <rect x="14" y="54" width="90" height="26" rx="13" fill="url(#miloBody)" />
        <circle cx="24" cy="57" r="16" fill="url(#miloBody)" />
      </g>
      {/* closed, happy eyes */}
      <path d="M50 56c3-4.5 7-4.5 10 0" fill="none" stroke="#1b2430" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M69 55c3-4.5 7-4.5 10 0" fill="none" stroke="#1b2430" strokeWidth="3.6" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="46" cy="65" rx="5" ry="3" fill="#ffb9b9" opacity="0.5" />
      <ellipse cx="83" cy="64" rx="5" ry="3" fill="#ffb9b9" opacity="0.5" />
    </svg>
  );
}

/** One soft cumulus mass. Gradient spans the whole shape, so no lobe seams. */
function Cloud({ x, y, s = 1, soft = 1, id }: { x: number; y: number; s?: number; soft?: number; id: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={soft}>
      <path
        d="M0 44c-13 0-22-9-22-21S-13 2 0 2c4-14 17-21 28-15 6-9 20-10 27 0 12-4 24 5 24 17 0 8-5 14-12 17 3 12-6 23-19 23H0Z"
        fill={`url(#${id})`}
      />
    </g>
  );
}

/** Soft cumulus band for the foot of the sky (landscape). */
export function CloudBank({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="cb1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="70%" stopColor="#fbfdff" /><stop offset="100%" stopColor="#e4eefa" />
        </linearGradient>
        <linearGradient id="cb2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#eaf3fd" />
        </linearGradient>
        <filter id="cb-blur" x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* hazy distant layer */}
      <g filter="url(#cb-blur)" opacity=".55">
        <ellipse cx="1130" cy="352" rx="250" ry="72" fill="#fff" />
        <ellipse cx="1320" cy="378" rx="200" ry="58" fill="#fff" />
        <ellipse cx="230" cy="378" rx="230" ry="58" fill="#fff" />
      </g>

      {/* the big bank, right of centre */}
      <g opacity=".96">
        <Cloud id="cb1" x={950} y={214} s={1.85} />
        <Cloud id="cb1" x={1196} y={250} s={1.45} />
        <Cloud id="cb2" x={1080} y={282} s={1.7} soft={0.97} />
      </g>

      {/* small puffs */}
      <Cloud id="cb2" x={92} y={330} s={1.15} soft={0.93} />
      <Cloud id="cb2" x={628} y={352} s={0.95} soft={0.74} />
    </svg>
  );
}

/** Portrait cloud field for phones. */
export function CloudField() {
  return (
    <svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice" className="milo-field" aria-hidden>
      <defs>
        <linearGradient id="cf1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="72%" stopColor="#fcfdff" /><stop offset="100%" stopColor="#e2edfa" />
        </linearGradient>
        <linearGradient id="cf2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#eef6fe" />
        </linearGradient>
        <filter id="cf-blur" x="-40%" y="-40%" width="180%" height="190%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      {/* distant haze at the very bottom */}
      <g filter="url(#cf-blur)" opacity=".6">
        <ellipse cx="80" cy="292" rx="130" ry="30" fill="#fff" />
        <ellipse cx="320" cy="288" rx="120" ry="28" fill="#fff" />
      </g>

      {/* big bank, upper right — the dominant shape in the reference */}
      <Cloud id="cf1" x={268} y={118} s={1.9} />
      <Cloud id="cf1" x={330} y={168} s={1.3} soft={0.98} />

      {/* medium puff, lower left */}
      <Cloud id="cf2" x={78} y={232} s={1.25} soft={0.97} />

      {/* edge wisp, right */}
      <Cloud id="cf2" x={340} y={244} s={0.9} soft={0.62} />
    </svg>
  );
}

/** The small founder-cloud squiggle used in the wordmark. */
export function WordSquiggle({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 4v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v4" />
      <path d="M6 14h12" />
    </svg>
  );
}

/**
 * The glowing cloud used inside the app. On a near-black page the mascot reads
 * as a light source: a warm-white cumulus with a soft halo, exactly like the
 * icon at the centre of foundable.com/home.
 */
export function GlowCloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} role="img" aria-label="Milo">
      <defs>
        <radialGradient id="gc-body" cx="46%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="58%" stopColor="#fdfbff" />
          <stop offset="100%" stopColor="#e8e4f5" />
        </radialGradient>
        <radialGradient id="gc-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset="55%" stopColor="#cbd6ff" stopOpacity=".22" />
          <stop offset="100%" stopColor="#cbd6ff" stopOpacity="0" />
        </radialGradient>
        <filter id="gc-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* halo */}
      <circle cx="60" cy="50" r="46" fill="url(#gc-halo)" />

      {/* body: three lobes + a flat belly */}
      <g filter="url(#gc-soft)" opacity=".95">
        <ellipse cx="44" cy="52" rx="27" ry="22" fill="#ffffff" opacity=".35" />
        <ellipse cx="78" cy="50" rx="22" ry="19" fill="#ffffff" opacity=".3" />
      </g>
      <g fill="url(#gc-body)">
        <circle cx="45" cy="45" r="24" />
        <circle cx="74" cy="38" r="21" />
        <circle cx="92" cy="54" r="16" />
        <rect x="21" y="55" width="76" height="22" rx="11" />
        <circle cx="30" cy="63" r="12" />
      </g>

      {/* closed, content eyes */}
      <path d="M50 56c3-4.2 6.6-4.2 9.6 0" fill="none" stroke="#23242a" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M67 55c3-4.2 6.6-4.2 9.6 0" fill="none" stroke="#23242a" strokeWidth="3.2" strokeLinecap="round" />
      {/* faint blush, like the reference */}
      <ellipse cx="46" cy="64" rx="4.5" ry="2.6" fill="#ffc9d4" opacity=".5" />
      <ellipse cx="81" cy="63" rx="4.5" ry="2.6" fill="#ffc9d4" opacity=".5" />
    </svg>
  );
}
