import React from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

function BulkActionToolbar({ selectedCount, onDelete, onClearSelection, isDeleting }) {
  if (selectedCount === 0) return null;

  const handleBulkDelete = () => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">
            Haluatko varmasti poistaa {selectedCount} tiketti{selectedCount > 1 ? 'ä' : 'n'}?
          </p>
          <p className="text-sm text-gray-600">
            Tämä toiminto on peruuttamaton ja poistaa tiketit pysyvästi.
          </p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete();
                toast.dismiss(t.id);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Poistetaan...' : 'Poista tiketit'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.dismiss(t.id)}
            >
              Peruuta
            </Button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      }
    );
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount} tiketti{selectedCount > 1 ? 'ä' : ''} valittu
        </span>
        
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Poistetaan...' : 'Poista valitut'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Tyhjennä valinta
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BulkActionToolbar;