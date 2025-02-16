import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      onCheckedChange={(checked) => onCheckedChange(checked)}
      className={`w-4 h-4 flex items-center justify-center border-2 border-gray-400 rounded-sm 
        ${checked ? "bg-blue-500 border-blue-500" : "bg-white"} hover:border-blue-500 ${className}`}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-white">
        <Check size={14} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

Checkbox.displayName = "Checkbox";
export { Checkbox };




