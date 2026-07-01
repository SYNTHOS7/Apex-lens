'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { label: 'Analyze', href: '/' },
    { label: 'History & Trends', href: '/history' },
    { label: 'Admin Metrics', href: '/admin' }
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/70 border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-8">
        <Link href="/" className="flex items-center space-x-2 font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent hover:scale-102 transition duration-200">
          <span>🔍 Apex Lens</span>
        </Link>

        {user && (
          <div className="hidden md:flex space-x-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition duration-150 ${
                    isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline text-xs text-zinc-500 font-mono select-none">
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium py-1.5 px-3 rounded-lg transition"
              type="button"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
