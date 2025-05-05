import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import axios from 'axios';
import { useState } from 'react';
import { authService } from '../../services/authService';
import UserManagementDialog from '../Admin/UserManagementDialog';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../Notifications/NotificationBell';
import { PlusCircle, Settings, Sparkles, Mailbox, X, TicketIcon } from 'lucide-react';
import NewTicketForm from '../Tickets/NewTicketForm';
import ProfilePicture from '../User/ProfilePicture';
import { motion, AnimatePresence } from 'framer-motion';
// Import placeholder for logo - this will need to be replaced with the actual logo file
import logoPlaceholder from '../../assets/logo.png';

export default function Header() {
  const { user, userRole } = useAuth();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const navigate = useNavigate();

  // Tarkistaa onko käyttäjällä hallintaoikeudet (admin tai tukihenkilö)
  const isSupportOrAdmin = userRole === 'ADMIN' || userRole === 'SUPPORT';

  const handleRoleChange = async (newRole) => {
    try {
      setIsChangingRole(true);
      const token = await authService.acquireToken();
      await axios.put(
        `${import.meta.env.VITE_API_URL}/users/role`,
        { role: newRole },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      // Päivitä sivu roolin vaihtamisen jälkeen
      window.location.reload();
    } catch (error) {
      console.error('Error changing role:', error);
      alert('Roolin vaihto epäonnistui');
    } finally {
      setIsChangingRole(false);
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'SUPPORT':
        return 'Tukihenkilö';
      case 'USER':
        return 'Opiskelija';
      default:
        return 'Opiskelija';
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'SUPPORT':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left section: Logo and navigation */}
          <div className="flex items-center gap-6">
            <Link to="/my-tickets" className="text-xl font-bold text-primary flex items-center">
              <img 
                src={logoPlaceholder} 
                alt="EseduTiketti" 
                className="h-12 w-auto" 
              />
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <nav className="hidden md:flex md:space-x-1">
                <Link
                  to="/my-tickets"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Omat tiketit
                </Link>

                {isSupportOrAdmin && (
                  <Link
                    to="/my-work"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Työnäkymä
                  </Link>
                )}

                {isSupportOrAdmin && (
                  <Link
                    to="/admin"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Hallintapaneeli
                  </Link>
                )}
                
                {userRole === 'ADMIN' && (
                  <Link
                    to="/ai-tools"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                  >
                    <Sparkles size={16} className="mr-1 text-yellow-500" />
                    Tekoälytyökalut
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Right section: Actions and user */}
          <div className="flex items-center gap-2 md:gap-4">
            {user && (
              <>
                {/* Create Ticket Button - Both Mobile & Desktop */}
                <button
                  onClick={() => setIsNewTicketOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-md hover:shadow-lg"
                >
                  <TicketIcon size={16} className="flex-shrink-0" />
                  <span className="hidden xs:inline">Luo tiketti</span>
                </button>

                {/* Admin: User Management (Now visible on mobile too) */}
                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => setIsUserManagementOpen(true)}
                    className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={16} />
                    <span className="hidden sm:inline">Käyttäjät</span>
                  </button>
                )}

                {/* Notifications */}
                <div className="relative">
                  <NotificationBell />
                </div>
                
                {/* User Profile Link */}
                <Link 
                  to="/profile"
                  className="flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-1 pr-2 hover:bg-gray-50 transition-colors"
                >
                  <ProfilePicture 
                    email={user.username} 
                    name={user.name} 
                    size="sm" 
                  />
                  <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[180px] truncate">
                    {user.name}
                  </span>
                </Link>
              </>
            )}

            {/* Login Button for non-authenticated users */}
            {!user && (
              <Link
                to="/login"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                Kirjaudu sisään
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* User Management Dialog */}
      <UserManagementDialog
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />

      {/* New Ticket Dialog */}
      {isNewTicketOpen && (
        <NewTicketForm onClose={() => setIsNewTicketOpen(false)} />
      )}
    </header>
  );
}