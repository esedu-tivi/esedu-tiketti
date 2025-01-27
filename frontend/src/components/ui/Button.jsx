import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

const Button = React.forwardRef(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    const variants = {
      default:
        'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
      destructive:
        'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg',
      outline:
        'border border-input hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md hover:shadow-lg',
      ghost: 'hover:bg-accent hover:text-accent-foreground shadow-none',
      link: 'underline-offset-4 hover:underline text-primary',
    };

    const sizes = {
      default: 'h-10 py-2 px-4',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
    };

    return (
      <Comp
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
