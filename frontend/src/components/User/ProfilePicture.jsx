import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';

/**
 * A component that displays a user's profile picture from Microsoft Graph API (cached in the backend)
 * or shows their initials if no picture is available
 */
const ProfilePicture = ({ 
  email, 
  name, 
  size = 'md', 
  className = '',
  showInitialsOnFail = true
}) => {
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Size mappings
  const sizeClasses = {
    'xs': 'w-6 h-6 text-xs',
    'sm': 'w-8 h-8 text-sm',
    'md': 'w-10 h-10 text-base',
    'lg': 'w-14 h-14 text-lg',
    'xl': 'w-20 h-20 text-xl',
    '2xl': 'w-24 h-24 text-2xl',
  };

  // Get initials for fallback
  const initials = userService.getUserInitials(name);

  useEffect(() => {
    const fetchProfilePicture = async () => {
      if (!email) return;
      
      setLoading(true);
      
      try {
        const picture = await userService.getUserProfilePicture(email);
        setProfilePicture(picture);
      } catch (err) {
        console.error('Error fetching profile picture:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (email) {
      fetchProfilePicture();
    }
  }, [email]);

  // Apply size class based on size prop
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  // Show spinner while loading
  if (loading) {
    return (
      <div className={`rounded-full bg-gray-100 flex items-center justify-center ${sizeClass} ${className}`}>
        <div className="w-1/2 h-1/2 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Profile picture available
  if (profilePicture) {
    return (
      <img 
        src={profilePicture} 
        alt={name || 'Profile picture'} 
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  // Fallback to initials
  return (
    <div 
      className={`rounded-full bg-primary text-white font-medium flex items-center justify-center ${sizeClass} ${className}`}
      title={name}
    >
      {showInitialsOnFail ? initials : <UserIcon className="w-1/2 h-1/2" />}
    </div>
  );
};

// For cases where we want to render just the icon
const UserIcon = ({ className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default ProfilePicture; 