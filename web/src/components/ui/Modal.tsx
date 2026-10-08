'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
}: ModalProps) {
  // Portaled to <body> so `fixed` positions against the viewport no matter
  // what transform/overflow/stacking-context ancestors the caller sits under
  // (e.g. a Leaflet map pane) — without this a caller-side ancestor can trap
  // the overlay and render it in normal flow instead of on top.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    // z-[1001]: Leaflet's own control panes sit at z-index 1000, above
    // Tailwind's z-50 — a lower value here left the map's zoom control
    // clickable through the modal.
    <div className="fixed inset-0 z-[1001] flex items-center justify-center" data-testid="modal-overlay">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        data-testid="modal-content"
        className={`
        relative bg-white rounded-shutaf-lg
        shadow-lg w-full mx-4 ${sizeClasses[size]}
        max-h-[90vh] overflow-y-auto
      `}>
        {(title || closeButton) && (
          <div className="flex items-center justify-between p-6 border-b border-card-border">
            {title && <h2 className="text-xl font-bold text-ink">{title}</h2>}
            {!title && <div />}
            {closeButton && (
              <button
                onClick={onClose}
                aria-label="סגור"
                data-testid="modal-close"
                className="p-1 hover:bg-neutral-bg-soft rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
        {footer && (
          <div className="border-t border-card-border p-6 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
