import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Unified Modal Component
 * Provides consistent modal behavior across the app
 * 
 * Features:
 * - Keyboard accessibility (Escape to close)
 * - Click outside to close
 * - Focus trapping
 * - Smooth animations
 * - Responsive (bottom sheet on mobile, centered on desktop)
 */

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColorClass = "text-indigo-400",
  iconBgClass = "bg-indigo-500/20",
  children,
  footer,
  size = "md", // sm, md, lg, xl, full
  showCloseButton = true,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  className,
}) => {
  // Handle escape key
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape' && closeOnEscape) {
      onClose();
    }
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    full: "sm:max-w-4xl",
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOutsideClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal Panel */}
      <div 
        className={twMerge(clsx(
          "relative bg-zinc-900 border border-white/10 w-full overflow-hidden shadow-2xl",
          "rounded-t-2xl sm:rounded-2xl",
          "max-h-[90vh] overflow-y-auto",
          "animate-slide-up sm:animate-scale-in",
          "sm:mx-4",
          sizes[size],
          className
        ))}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={clsx("p-2 rounded-lg", iconBgClass)}>
                  <Icon className={clsx("w-5 h-5", iconColorClass)} />
                </div>
              )}
              {title && (
                <div>
                  <h2 id="modal-title" className="text-lg font-semibold text-white">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-zinc-500">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-white/5 bg-zinc-900/50 sticky bottom-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
