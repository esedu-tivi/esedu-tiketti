import * as React from 'react';

const Alert = React.forwardRef(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-background',
      destructive:
        'border-destructive/50 text-destructive dark:border-destructive',
    };
    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11 ${variants[variant]} ${className}`}
        {...props}
      />
    );
  },
);
Alert.displayName = 'Alert';

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };
