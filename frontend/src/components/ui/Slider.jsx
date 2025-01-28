import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

const Slider = React.forwardRef(({ className, ...props }, ref) => {
  const [value, setValue] = React.useState([50]);

  const getTrackColor = (value) => {
    if (value <= 33) return 'bg-green-500';
    if (value <= 66) return 'bg-yellow-500';
    return 'bg-red-500';
  };


  return (
    <div className="relative w-full">
      <SliderPrimitive.Root
        ref={ref}
        className={`relative flex w-full touch-none select-none items-center ${className}`}
        value={value}
        onValueChange={setValue}
        {...props}
      >
        <SliderPrimitive.Track
          className={`relative h-2 w-full grow overflow-hidden rounded-full ${getTrackColor(value[0])}`}
        >
          <SliderPrimitive.Range className="absolute h-full transition-all duration-200" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-blue-900 bg-white ring-offset-background transition-transform duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>


    </div>
  );
});

Slider.displayName = 'Slider';

export { Slider };
