import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

const Slider = React.forwardRef(({ className, value, onValueChange, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        ref={ref}
        className={`relative flex w-full touch-none select-none items-center ${className}`}
        value={value}
        onValueChange={onValueChange}
        step={1}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-2 w-full bg-gray-300 rounded-full">
          <SliderPrimitive.Range
            className="absolute h-full bg-blue-500 transition-all duration-300 ease-in-out rounded"
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-5 w-5 rounded-full border-2 border-blue-900 bg-white 
          cursor-pointer transition-transform duration-300 ease-in-out
          hover:scale-110 active:scale-95 focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        />
      </SliderPrimitive.Root>
    </div>
  );
});

Slider.displayName = 'Slider';

export { Slider };
