import * as React from 'react';

export const Alert = React.forwardRef(
  (
    { className = '', variant = 'default', title, message, children, ...props },
    ref,
  ) => {
    const variants = {
      default: 'bg-blue-50 text-blue-700 border-blue-200',
      error: 'bg-red-50 text-red-700 border-red-200',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      success: 'bg-green-100 text-green-700 border-green-200',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`rounded-lg border p-4 text-center py-8 ${variants[variant] || variants.default} ${className}`}
        {...props}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message && <AlertDescription>{message}</AlertDescription>}
        {children}
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef(
  ({ className = '', ...props }, ref) => (
    <h5
      ref={ref}
      className={`mb-1 font-medium leading-none tracking-tight ${className}`}
      {...props}
    />
  ),
);
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`text-xl opacity-90 text-center ${className}`} {...props} />
  ),
);

