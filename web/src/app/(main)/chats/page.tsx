'use client';

import { Avatar } from '@/components/ui';

export default function ChatsPage() {
  const conversations = [
    {
      id: '1',
      name: 'Sarah Cohen',
      initials: 'SC',
      lastMessage: 'That sounds great! When can we meet?',
      timestamp: '2026-08-20 14:32',
      unread: 2,
    },
    {
      id: '2',
      name: 'Apartment Listing',
      initials: 'AL',
      lastMessage: 'Your inquiry has been received',
      timestamp: '2026-08-20 12:15',
      unread: 0,
    },
    {
      id: '3',
      name: 'Group: Summer Place',
      initials: 'SP',
      lastMessage: 'Mira: Should we schedule a viewing?',
      timestamp: '2026-08-19 18:45',
      unread: 3,
    },
  ];

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b border-card-border px-6 py-8 sticky top-0 bg-white z-10">
          <h1 className="text-3xl font-bold text-ink">צ'אטים</h1>
        </div>

        {/* Conversations List */}
        <div className="divide-y divide-card-border">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className="w-full px-4 py-4 hover:bg-neutral-bg-soft transition-colors text-start flex items-center gap-4"
            >
              <Avatar initials={conv.initials} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-ink">{conv.name}</h3>
                  <span className="text-xs text-muted-text">{conv.timestamp}</span>
                </div>
                <p className="text-sm text-muted-text truncate">{conv.lastMessage}</p>
              </div>

              {conv.unread > 0 && (
                <div className="w-6 h-6 rounded-full bg-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {conv.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
