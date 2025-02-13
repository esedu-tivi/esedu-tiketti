import React, { useState } from 'react';
import MentionInput from '../MentionInput';

const AddComment = ({ onSubmit, isSubmitting }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    await onSubmit(comment);
    setComment('');
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="mb-4">
        <MentionInput
          value={comment}
          onChange={setComment}
          placeholder="Kirjoita kommentti... Käytä @-merkkiä mainitaksesi käyttäjän"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isSubmitting || !comment.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isSubmitting ? 'Lähetetään...' : 'Lähetä kommentti'}
        </button>
      </div>
    </form>
  );
};

export default AddComment; 