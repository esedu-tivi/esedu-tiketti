import React from 'react';
import { cn } from '../../utils/cn';

const TabsContext = React.createContext(null);

export function Tabs({ defaultValue, value, onValueChange, className, children }) {
  const [selectedValue, setSelectedValue] = React.useState(value || defaultValue);

  const handleValueChange = (newValue) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }) {
  return (
    <div className={cn(
      'inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500',
      className
    )}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children }) {
  const context = React.useContext(TabsContext);
  const isSelected = context?.value === value;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-900',
        className
      )}
      onClick={() => context?.onValueChange(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }) {
  const context = React.useContext(TabsContext);
  const isSelected = context?.value === value;

  if (!isSelected) return null;

  return (
    <div
      className={cn(
        'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2',
        className
      )}
    >
      {children}
    </div>
  );
} 