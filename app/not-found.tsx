import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl font-bold text-gray-200 mb-4">404</p>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Page not found</h2>
        <p className="text-sm text-gray-500 mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/">
          <Button className="bg-red-800 hover:bg-red-900 text-white" size="sm">
            Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
