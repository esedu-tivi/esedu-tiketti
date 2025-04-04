import React, { useState } from 'react';
import { PlusCircle, X, TicketIcon } from 'lucide-react';
import NewTicketForm from '../Tickets/NewTicketForm';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleOpen = () => {
    setIsOpen(true);
  };
  
  const handleClose = () => {
    setIsOpen(false);
  };
  
  return (
    <>
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        <AnimatePresence>
          {showTooltip && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
            >
              Luo uusi tiketti
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpen}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onTouchStart={() => setShowTooltip(true)}
          onTouchEnd={() => setShowTooltip(false)}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:shadow-2xl border-2 border-white transition-all"
          aria-label="Create new ticket"
        >
          <TicketIcon size={24} />
        </motion.button>
      </div>
      
      <AnimatePresence>
        {isOpen && <NewTicketForm onClose={handleClose} />}
      </AnimatePresence>
    </>
  );
} 