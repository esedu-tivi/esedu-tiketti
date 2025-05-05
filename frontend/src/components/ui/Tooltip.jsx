import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Tooltip component with modern styling and animations
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The element that triggers the tooltip
 * @param {string} props.content - The tooltip text content
 * @param {string} props.side - The preferred side ('top', 'right', 'bottom', 'left')
 * @param {string} props.align - The alignment ('start', 'center', 'end')
 * @param {boolean} props.delayShow - Delay showing the tooltip (ms)
 * @param {boolean} props.delayHide - Delay hiding the tooltip (ms)
 */
export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayShow = 300,
  delayHide = 100,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const tooltipRef = useRef(null);

  // Recalculate position when open state changes
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0;
      let y = 0;

      // Calculate position based on side and alignment
      switch (side) {
        case 'top':
          y = rect.top - 8;
          x = rect.left + rect.width / 2;
          break;
        case 'right':
          y = rect.top + rect.height / 2;
          x = rect.right + 8;
          break;
        case 'bottom':
          y = rect.bottom + 8;
          x = rect.left + rect.width / 2;
          break;
        case 'left':
          y = rect.top + rect.height / 2;
          x = rect.left - 8;
          break;
      }

      setPosition({ x, y });
    }
  }, [isOpen, side, align]);

  // Handle mouse events
  const handleMouseEnter = () => {
    clearTimeout(hideTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayShow);
  };

  const handleMouseLeave = () => {
    clearTimeout(showTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, delayHide);
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(showTimeoutRef.current);
      clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Clone the child and attach event listeners
  const child = React.Children.only(children);
  const triggerElement = React.cloneElement(child, {
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleMouseEnter,
    onBlur: handleMouseLeave,
  });

  // Calculate tooltip position classes
  const getTooltipPositionStyles = () => {
    const baseStyles = {
      position: 'absolute',
      transformOrigin: '',
      transform: '',
    };

    switch (side) {
      case 'top':
        baseStyles.top = `${position.y}px`;
        baseStyles.left = `${position.x}px`;
        baseStyles.transform = 'translateX(-50%) translateY(-100%)';
        baseStyles.transformOrigin = 'bottom center';
        break;
      case 'right':
        baseStyles.top = `${position.y}px`;
        baseStyles.left = `${position.x}px`;
        baseStyles.transform = 'translateY(-50%)';
        baseStyles.transformOrigin = 'left center';
        break;
      case 'bottom':
        baseStyles.top = `${position.y}px`;
        baseStyles.left = `${position.x}px`;
        baseStyles.transform = 'translateX(-50%)';
        baseStyles.transformOrigin = 'top center';
        break;
      case 'left':
        baseStyles.top = `${position.y}px`;
        baseStyles.left = `${position.x}px`;
        baseStyles.transform = 'translateX(-100%) translateY(-50%)';
        baseStyles.transformOrigin = 'right center';
        break;
    }

    return baseStyles;
  };

  return (
    <>
      {triggerElement}
      {isOpen &&
        createPortal(
          <div 
            ref={tooltipRef}
            style={getTooltipPositionStyles()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className={`z-[999] px-2.5 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-sm ${className}`}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body
        )}
    </>
  );
}

export default Tooltip; 