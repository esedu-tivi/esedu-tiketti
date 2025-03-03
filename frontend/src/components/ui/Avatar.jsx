import React from 'react';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper function for merging classes
const cn = (...inputs) => {
  return twMerge(clsx(inputs));
};

const avatarVariants = cva(
  "inline-flex items-center justify-center rounded-full overflow-hidden",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const Avatar = React.forwardRef(({ className, size, src, alt, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(avatarVariants({ size, className }))}
    {...props}
  >
    {src ? (
      <img 
        src={src} 
        alt={alt || "Avatar"} 
        className="h-full w-full object-cover"
      />
    ) : null}
  </div>
));

Avatar.displayName = "Avatar";

const AvatarFallback = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-gray-700",
      className
    )}
    {...props}
  >
    {children}
  </div>
));

AvatarFallback.displayName = "AvatarFallback";

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-current bg-transparent",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-blue-100 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(badgeVariants({ variant, className }))}
    {...props}
  />
));

Badge.displayName = "Badge";

export { Avatar, AvatarFallback, Badge }; 