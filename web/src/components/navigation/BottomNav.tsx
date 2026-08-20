'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Sparkles, Map, Plus, MessageCircle } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export function BottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: 'פרופיל',
      href: '/profile',
      icon: <User className="w-6 h-6" />,
    },
    {
      label: 'חיפוש',
      href: '/discover',
      icon: <Sparkles className="w-6 h-6" />,
    },
    {
      label: 'מפה',
      href: '/map',
      icon: <Map className="w-6 h-6" />,
    },
    {
      label: 'הוסף',
      href: '/compose',
      icon: <Plus className="w-6 h-6" />,
      badge: undefined, // Plus doesn't get a badge
    },
    {
      label: 'צ\'אט',
      href: '/chats',
      icon: <MessageCircle className="w-6 h-6" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/compose') return false; // Plus never gets active state
    return pathname?.startsWith(href);
  };

  return (
    <nav
      className="
        fixed bottom-0 inset-x-0 border-t
        md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b
        bg-white border-card-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:shadow-sm z-40
      "
    >
      <div className="flex items-center justify-around h-20 md:h-16 md:justify-start md:gap-10 md:px-8 max-w-7xl mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex flex-col items-center justify-center gap-1 flex-1 h-full
              md:flex-row md:flex-none md:gap-2
              transition-colors relative group
              ${
                isActive(item.href)
                  ? 'text-orange'
                  : 'text-muted-text hover:text-ink'
              }
            `}
          >
            {/* Icon */}
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-2 -inset-e-2 bg-error text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span className="text-xs font-medium">{item.label}</span>

            {/* Active Indicator */}
            {isActive(item.href) && (
              <div className="absolute top-0 inset-x-0 h-1 bg-orange md:top-auto md:bottom-0" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
