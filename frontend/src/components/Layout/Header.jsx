import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import axios from 'axios';
import { useState } from 'react';
import { authService } from '../../services/authService';
import UserManagementDialog from '../Admin/UserManagementDialog';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../Notifications/NotificationBell';
import { PlusCircle, Settings } from 'lucide-react';
import NewTicketForm from '../Tickets/NewTicketForm';
import ProfilePicture from '../User/ProfilePicture';

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
              <span className="text-primary">Tiketti</span>
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
                  className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border border-green-200"
                >
                  <span className="hidden xs:inline">Luo</span>
                  <span className="hidden xs:inline">tiketti</span>
                  <PlusCircle size={16} className="flex-shrink-0" />
                </button>

                {/* Admin: User Management (Desktop only) */}
                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => setIsUserManagementOpen(true)}
                    className="hidden md:flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={16} />
                    <span>Käyttäjät</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full relative overflow-hidden">
            <div className="flex justify-between items-center border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-800">Luo uusi tiketti</h2>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✖
              </button>
            </div>
            <div className="p-6">
              <NewTicketForm onClose={() => setIsNewTicketOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}