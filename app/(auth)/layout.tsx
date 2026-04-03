import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — dark brand side */}
      <div className="hidden lg:flex flex-col bg-zinc-900 text-white p-10">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Glam Delivery" width={32} height={32} className="rounded-lg" />
          <span className="font-semibold text-base tracking-tight">Glam Delivery</span>
        </div>
        <div className="mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              &ldquo;This platform has transformed how we manage our fleet — real-time tracking, seamless rider coordination, and instant delivery updates all in one place.&rdquo;
            </p>
            <footer className="text-sm text-zinc-400">Collins Asante — Operations Manager</footer>
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
