'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  // Clone children and inject onClick handler into DialogTrigger
  const processedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === DialogTrigger) {
      return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => onOpenChange(true),
      });
    }
    return child;
  });

  // Render the trigger button outside the portal
  const trigger = React.Children.toArray(processedChildren).find(
    (child) => React.isValidElement(child) && child.type === DialogTrigger
  );

  // Render the content inside the portal when open
  const content = React.Children.toArray(processedChildren).filter(
    (child) => React.isValidElement(child) && child.type !== DialogTrigger
  );

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => onOpenChange(false)}
          >
            <div className="fixed inset-0 bg-black/50" />
            <div
              className="relative z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {content}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactElement;
  onClick?: () => void;
}

export function DialogTrigger({ asChild, children, onClick }: DialogTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children, {
      ...childProps,
      onClick: (e: React.MouseEvent) => {
        // Call original onClick if it exists
        if (typeof childProps.onClick === 'function') {
          (childProps.onClick as (e: React.MouseEvent) => void)(e);
        }
        // Call the trigger onClick
        onClick?.();
      },
    } as React.Attributes);
  }

  return <button onClick={onClick}>{children}</button>;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  // Always include background, rounding, and shadow. Custom className extends these defaults.
  const baseClasses = 'bg-white dark:bg-gray-900 rounded-lg shadow-lg';
  const defaultSizeClasses = 'max-w-md w-full mx-4';
  const finalClassName = className
    ? `${baseClasses} ${className}`
    : `${baseClasses} ${defaultSizeClasses}`;

  return (
    <div className={finalClassName}>
      {children}
    </div>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return <div className={`px-6 pt-6 pb-4 ${className}`}>{children}</div>;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({
  children,
  className = '',
}: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 dark:text-gray-400 mt-2 ${className}`}>
      {children}
    </p>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <div className={`px-6 py-4 flex justify-end gap-2 ${className}`}>
      {children}
    </div>
  );
}
