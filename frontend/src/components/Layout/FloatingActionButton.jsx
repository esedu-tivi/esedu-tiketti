import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import NewTicketForm from '../Tickets/NewTicketForm';

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
        {showTooltip && (
          <div className="absolute -top-10 right-0 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            Luo uusi tiketti
          </div>
        )}
        <button
          onClick={handleOpen}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onTouchStart={() => setShowTooltip(true)}
          onTouchEnd={() => setShowTooltip(false)}
          className="bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-green-500 transition-colors border-2 border-white animate-pulse"
          aria-label="Create new ticket"
        >
          <PlusCircle size={28} />
        </button>
      </div>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 flex justify-between p-4 bg-white rounded-t-xl border-b">
              <h2 className="text-xl font-bold text-gray-800">Luo uusi tiketti</h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <NewTicketForm onClose={handleClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
} 