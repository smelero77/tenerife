import { GoogleLikeSearch } from '@/components/search/google-like-search';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with search */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full max-w-2xl">
              <h1 className="text-xl sm:text-2xl font-bold">MuniTenerife</h1>
              <ThemeToggle />
            </div>
            <GoogleLikeSearch />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
