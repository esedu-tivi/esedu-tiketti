import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { 
  Home, 
  TicketIcon, 
  PlusCircle, 
  User, 
  Settings,
  Briefcase,
  Users,
  Sparkles,
  FileText
} from 'lucide-react';
import UserManagementDialog from '../Admin/UserManagementDialog';

export default function MobileNavBar() {
  const location = useLocation();
  const { user, userRole } = useAuth();
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  
  // Check if user has management rights (admin or support)
  const isSupportOrAdmin = userRole === 'ADMIN' || userRole === 'SUPPORT';
  const isAdmin = userRole === 'ADMIN';
  
  // Skip rendering the navigation if user is not logged in
  if (!user) return null;
  
  // Function to check if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Generate a CSS class for active/inactive nav items
  const getNavItemClass = (path) => {
    const baseClass = "flex flex-col items-center justify-center text-xs";
    return `${baseClass} ${isActive(path) ? 'text-primary font-medium' : 'text-gray-500'}`;
  };
  
  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className={`grid ${isAdmin ? 'grid-cols-6' : isSupportOrAdmin ? 'grid-cols-5' : 'grid-cols-4'} h-16`}>
          {/* Home / My Tickets */}
          <Link to="/my-tickets" className={getNavItemClass('/my-tickets')}>
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <Home size={24} className={`mb-1 ${isActive('/my-tickets') ? 'text-primary' : 'text-gray-500'}`} />
              <span className="text-[10px]">Omat tiketit</span>
              {isActive('/my-tickets') && (
                <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </div>
          </Link>
          
          {/* Work View for Support/Admin */}
          {isSupportOrAdmin ? (
            <Link to="/my-work" className={getNavItemClass('/my-work')}>
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <Briefcase size={24} className={`mb-1 ${isActive('/my-work') ? 'text-primary' : 'text-gray-500'}`} />
                <span className="text-[10px]">Työnäkymä</span>
                {isActive('/my-work') && (
                  <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          ) : (
            <Link to="/tickets" className={getNavItemClass('/tickets')}>
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <TicketIcon size={24} className={`mb-1 ${isActive('/tickets') ? 'text-primary' : 'text-gray-500'}`} />
                <span className="text-[10px]">Tiketit</span>
                {isActive('/tickets') && (
                  <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          )}
          
          {/* Reports for Support/Admin */}
          {isSupportOrAdmin && (
            <Link to="/reports" className={getNavItemClass('/reports')}>
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <FileText size={24} className={`mb-1 ${isActive('/reports') ? 'text-primary' : 'text-gray-500'}`} />
                <span className="text-[10px]">Raportit</span>
                {isActive('/reports') && (
                  <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          )}
          
          {/* Admin Panel for Support/Admin */}
          {isSupportOrAdmin && (
            <Link to="/admin" className={getNavItemClass('/admin')}>
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <Settings size={24} className={`mb-1 ${isActive('/admin') ? 'text-primary' : 'text-gray-500'}`} />
                <span className="text-[10px]">Hallinta</span>
                {isActive('/admin') && (
                  <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          )}
          
          {/* AI Tools for Admin only */}
          {userRole === 'ADMIN' && (
            <Link to="/ai-tools" className={getNavItemClass('/ai-tools')}>
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <Sparkles size={24} className={`mb-1 ${isActive('/ai-tools') ? 'text-primary' : 'text-yellow-500'}`} />
                <span className="text-[10px]">Tekoäly</span>
                {isActive('/ai-tools') && (
                  <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          )}
          
          {/* Profile */}
          <Link to="/profile" className={getNavItemClass('/profile')}>
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <User size={24} className={`mb-1 ${isActive('/profile') ? 'text-primary' : 'text-gray-500'}`} />
              <span className="text-[10px]">Profiili</span>
              {isActive('/profile') && (
                <div className="absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </div>
          </Link>
        </div>
      </nav>
      
      {/* User Management Dialog */}
      {isAdmin && (
        <UserManagementDialog
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
        />
      )}
    </>
  );
} 