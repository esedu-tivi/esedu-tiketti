import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import axios from 'axios';
import { useState } from 'react';
import { authService } from '../../services/authService';
import UserManagementDialog from '../Admin/UserManagementDialog';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../Notifications/NotificationBell';
import { UserCircle } from 'lucide-react';
import  NewTicketForm from '../Tickets/NewTicketForm';



export default function Header() {
  const { user, userRole, logout } = useAuth();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const navigate = useNavigate();
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);


  // Tarkistaa onko käyttäjällä hallintaoikeudet (admin tai tukihenkilö)
  const hasManagementRights = userRole === 'ADMIN' || userRole === 'SUPPORT';

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

  const isSupportOrAdmin = userRole === 'SUPPORT' || userRole === 'ADMIN';

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/my-tickets" className="text-xl font-bold text-primary">
              Tikettijärjestelmä
            </Link>

            <nav className="hidden md:flex md:space-x-4">
              {user && (
                <>
                  <Link
                    to="/my-tickets"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Omat tiketit
                  </Link>

                  {/* Näytetään työnäkymä tukihenkilöille ja admineille */}
                  {isSupportOrAdmin && (
                    <Link
                      to="/my-work"
                      className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Työnäkymä
                    </Link>
                  )}

                <button
                  onClick={() => setIsNewTicketOpen(true)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Uusi tiketti
                </button>


                  {isSupportOrAdmin && (
                    <Link
                      to="/admin"
                      className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Hallintapaneeli
                    </Link>
                  )}
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Development-ympäristön roolin vaihto */}
                {import.meta.env.VITE_ENVIRONMENT === 'development' && (
                  <div className="relative">
                    <select
                      value={userRole || ''}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      disabled={isChangingRole}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <option value="USER">Opiskelija</option>
                      <option value="SUPPORT">Tukihenkilö</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {isChangingRole && (
                      <div className="absolute right-0 top-0 flex h-full w-full items-center justify-center bg-white/50">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                )}

                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => setIsUserManagementOpen(true)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    Käyttäjien hallinta
                  </button>
                )}

                <NotificationBell />

                <div className="ml-4 flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors"
                  >
                    <UserCircle className="w-5 h-5" />
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs">Hallinnoi profiilia</span>
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded"
                  >
                    Kirjaudu ulos
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Kirjaudu sisään
              </Link>
            )}
          </div>
        </div>
      </div>

      <UserManagementDialog
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
      />


          {isNewTicketOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full relative">
                <button
                  onClick={() => setIsNewTicketOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                  ✖
                </button>
                <NewTicketForm onClose={() => setIsNewTicketOpen(false)} />
              </div>
            </div>
          )}

    </header>
  );
}
