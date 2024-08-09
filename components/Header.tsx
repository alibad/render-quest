import Link from 'next/link';
import { Button } from '@/components/shared/ui/button';

export function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          RenderQuest
        </Link>
        <div className="space-x-4">
          <Link href="/tutorials" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Tutorials
          </Link>
          <Button variant="primary" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}