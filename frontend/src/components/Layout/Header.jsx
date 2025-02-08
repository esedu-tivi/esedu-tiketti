import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import axios from 'axios';
import { useState } from 'react';
import { authService } from '../../services/authService';
import UserManagementDialog from '../Admin/UserManagementDialog';

export default function Header() {
  const { user, userRole, logout } = useAuth();
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

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
                  <Link
                    to="/new-ticket"
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Uusi tiketti
                  </Link>

                  {hasManagementRights && (
                    <>
                      <Link
                        to="/admin"
                        className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Hallintapaneeli
                      </Link>
                    </>
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

                <span className="text-sm text-gray-700">
                  {user.name || user.email}
                  {userRole && (
                    <span className="ml-2 text-xs text-gray-500">
                      (
                      {userRole === 'SUPPORT'
                        ? 'Tukihenkilö'
                        : userRole === 'ADMIN'
                          ? 'Admin'
                          : 'Opiskelija'}
                      )
                    </span>
                  )}
                </span>
                <button
                  onClick={logout}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Kirjaudu ulos
                </button>
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
    </header>
  );
}
