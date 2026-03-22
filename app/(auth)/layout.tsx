import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Glam Delivery" width={56} height={56} className="rounded-2xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Glam Delivery</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
