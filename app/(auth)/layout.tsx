import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — dark brand side */}
      <div className="hidden lg:flex flex-col bg-zinc-900 text-white p-10 relative overflow-hidden">
        {/* Delivery-themed SVG illustration */}
        <div className="absolute inset-0 opacity-20 pointer-events-none select-none">
          <svg width="100%" height="100%" viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Route dashed lines */}
            <line x1="80" y1="200" x2="300" y2="340" stroke="#991b1b" strokeWidth="1.5" strokeDasharray="8 6" />
            <line x1="300" y1="340" x2="500" y2="220" stroke="#991b1b" strokeWidth="1.5" strokeDasharray="8 6" />
            <line x1="500" y1="220" x2="440" y2="480" stroke="#991b1b" strokeWidth="1.5" strokeDasharray="8 6" />
            <line x1="440" y1="480" x2="160" y2="520" stroke="#991b1b" strokeWidth="1.5" strokeDasharray="8 6" />
            <line x1="160" y1="520" x2="80" y2="200" stroke="#991b1b" strokeWidth="1.5" strokeDasharray="8 6" />

            {/* Location pin — warehouse */}
            <circle cx="80" cy="192" r="14" fill="#991b1b" />
            <rect x="72" y="182" width="16" height="14" rx="3" fill="white" opacity="0.9" />
            <polygon points="80,200 74,188 86,188" fill="#991b1b" />

            {/* Location pins — stops */}
            <circle cx="300" cy="332" r="11" fill="#7f1d1d" />
            <circle cx="300" cy="332" r="5" fill="white" opacity="0.8" />

            <circle cx="500" cy="212" r="11" fill="#7f1d1d" />
            <circle cx="500" cy="212" r="5" fill="white" opacity="0.8" />

            <circle cx="440" cy="472" r="11" fill="#7f1d1d" />
            <circle cx="440" cy="472" r="5" fill="white" opacity="0.8" />

            <circle cx="160" cy="512" r="11" fill="#7f1d1d" />
            <circle cx="160" cy="512" r="5" fill="white" opacity="0.8" />

            {/* Package box 1 */}
            <g transform="translate(240, 420) rotate(-10)">
              <rect width="52" height="44" rx="4" fill="#3f3f46" stroke="#991b1b" strokeWidth="1.5" />
              <line x1="26" y1="0" x2="26" y2="44" stroke="#991b1b" strokeWidth="1" />
              <line x1="8" y1="14" x2="44" y2="14" stroke="#991b1b" strokeWidth="1" />
            </g>

            {/* Package box 2 */}
            <g transform="translate(380, 120) rotate(8)">
              <rect width="44" height="38" rx="4" fill="#3f3f46" stroke="#991b1b" strokeWidth="1.5" />
              <line x1="22" y1="0" x2="22" y2="38" stroke="#991b1b" strokeWidth="1" />
              <line x1="6" y1="12" x2="38" y2="12" stroke="#991b1b" strokeWidth="1" />
            </g>

            {/* Package box 3 */}
            <g transform="translate(100, 370) rotate(-5)">
              <rect width="38" height="32" rx="4" fill="#3f3f46" stroke="#991b1b" strokeWidth="1.5" />
              <line x1="19" y1="0" x2="19" y2="32" stroke="#991b1b" strokeWidth="1" />
              <line x1="5" y1="10" x2="33" y2="10" stroke="#991b1b" strokeWidth="1" />
            </g>

            {/* Rider / scooter silhouette */}
            <g transform="translate(285, 240)">
              {/* body */}
              <ellipse cx="20" cy="22" rx="16" ry="10" fill="#52525b" />
              {/* head */}
              <circle cx="32" cy="10" r="8" fill="#52525b" />
              {/* helmet visor */}
              <path d="M26 8 Q32 4 38 8" stroke="#991b1b" strokeWidth="2" fill="none" />
              {/* scooter body */}
              <rect x="0" y="28" width="50" height="10" rx="5" fill="#3f3f46" />
              {/* wheels */}
              <circle cx="8" cy="42" r="7" fill="#27272a" stroke="#52525b" strokeWidth="2" />
              <circle cx="8" cy="42" r="3" fill="#52525b" />
              <circle cx="42" cy="42" r="7" fill="#27272a" stroke="#52525b" strokeWidth="2" />
              <circle cx="42" cy="42" r="3" fill="#52525b" />
              {/* handlebar */}
              <line x1="40" y1="28" x2="52" y2="20" stroke="#52525b" strokeWidth="3" strokeLinecap="round" />
              {/* speed lines */}
              <line x1="-10" y1="30" x2="-30" y2="30" stroke="#991b1b" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="-8" y1="36" x2="-22" y2="36" stroke="#991b1b" strokeWidth="1" strokeDasharray="3 3" />
            </g>

            {/* Checkmark — completed delivery */}
            <g transform="translate(460, 440)">
              <circle cx="16" cy="16" r="14" fill="#14532d" opacity="0.8" />
              <polyline points="8,16 13,22 24,10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>

            {/* Floating dots — decorative */}
            <circle cx="150" cy="140" r="3" fill="#991b1b" opacity="0.5" />
            <circle cx="520" cy="380" r="3" fill="#991b1b" opacity="0.5" />
            <circle cx="60" cy="450" r="2.5" fill="#991b1b" opacity="0.4" />
            <circle cx="350" cy="560" r="2.5" fill="#991b1b" opacity="0.4" />
            <circle cx="490" cy="560" r="2" fill="#991b1b" opacity="0.3" />
          </svg>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative">
          <Image src="/logo.png" alt="Glam Delivery" width={32} height={32} className="rounded-lg" />
          <span className="font-semibold text-base tracking-tight">Glam Delivery</span>
        </div>

        {/* Quote */}
        <div className="mt-auto relative">
          <blockquote>
            <p className="text-lg leading-relaxed text-zinc-100">
              &ldquo;Every delivery is a promise we keep — connecting riders, customers, and businesses with speed and precision that drives our company forward.&rdquo;
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
          <Image src="/logo.png" alt="Glam Delivery" width={32} height={32} className="rounded-lg" />
          <span className="font-semibold text-base tracking-tight text-gray-900">Glam Delivery</span>
        </div>
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
