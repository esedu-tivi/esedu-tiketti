import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authService } from '../../services/authService';
import axios from 'axios';
import { 
  Search, 
  Trash2, 
  RefreshCw, 
  User,
  Ticket,
  MessageSquare,
  Loader2,
  Ban,
  CheckCircle,
  MoreVertical
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';

export default function DiscordUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteTickets, setDeleteTickets] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRefs = useRef({});

  useEffect(() => {
    fetchDiscordUsers();
  }, []);

  const fetchDiscordUsers = async () => {
    try {
      setLoading(true);
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/discord/users?includeStats=true`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching Discord users:', error);
      toast.error('Virhe haettaessa Discord-käyttäjiä');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUser = async (userId) => {
    try {
      setSyncing(userId);
      const token = await authService.acquireToken();
      await axios.post(
        `${import.meta.env.VITE_API_URL}/discord/users/${userId}/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Käyttäjätiedot synkronoitu');
      fetchDiscordUsers();
    } catch (error) {
      console.error('Error syncing user:', error);
      toast.error('Synkronointi epäonnistui');
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleBlock = async (user) => {
    try {
      const token = await authService.acquireToken();
      await axios.put(
        `${import.meta.env.VITE_API_URL}/discord/users/${user.id}/block`,
        { isBlocked: !user.isBlocked },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(user.isBlocked ? 'Käyttäjän esto poistettu' : 'Käyttäjä estetty');
      fetchDiscordUsers();
    } catch (error) {
      console.error('Error toggling block status:', error);
      toast.error('Eston muuttaminen epäonnistui');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUser) return;

    try {
      const token = await authService.acquireToken();
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/discord/users/${deleteUser.id}`,
        {
          data: { deleteTickets },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Käyttäjä poistettu');
      setDeleteUser(null);
      setDeleteTickets(false);
      fetchDiscordUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      if (error.response?.data?.message?.includes('existing tickets')) {
        toast.error('Käyttäjällä on tikettejä. Poista ne ensin tai valitse "Poista myös tiketit".');
      } else {
        toast.error('Käyttäjän poisto epäonnistui');
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.discordUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.discordId?.includes(searchTerm)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-menu')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Discord-käyttäjät</h2>
          <p className="text-sm text-gray-500">Hallitse Discordista tulleita käyttäjiä</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <User size={14} className="mr-1" />
            {users.length} käyttäjää
          </span>
          <button 
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            onClick={fetchDiscordUsers}
          >
            <RefreshCw size={16} className="mr-2" />
            Päivitä
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Hae käyttäjää..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Käyttäjä
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discord ID
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tila
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tiketit
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kommentit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Luotu
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Toiminnot
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Ei Discord-käyttäjiä
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                        <MessageSquare size={16} />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || user.discordUsername}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="px-2 py-1 text-xs bg-gray-100 rounded">
                      {user.discordId}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {user.isBlocked ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Ban size={12} className="mr-1" />
                        Estetty
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" />
                        Aktiivinen
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user._count?.tickets > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <Ticket size={12} className="mr-1" />
                      {user._count?.tickets || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user._count?.comments > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <MessageSquare size={12} className="mr-1" />
                      {user._count?.comments || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: fi })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative inline-block dropdown-menu">
                      <button
                        ref={(el) => dropdownRefs.current[user.id] = el}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openDropdown === user.id) {
                            setOpenDropdown(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setDropdownPosition({
                              top: rect.bottom + window.scrollY + 5,
                              left: rect.right - 192 + window.scrollX // 192px = 48 * 4 (w-48 in tailwind)
                            });
                            setOpenDropdown(user.id);
                          }
                        }}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>
                      
                      {openDropdown === user.id && createPortal(
                        <>
                          {/* Invisible overlay to capture clicks outside */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setOpenDropdown(null)}
                          />
                          {/* Dropdown menu */}
                          <div 
                            className="fixed w-48 bg-white rounded-md shadow-xl border border-gray-200 z-50"
                            style={{
                              top: `${dropdownPosition.top}px`,
                              left: `${dropdownPosition.left}px`
                            }}
                          >
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center"
                            onClick={() => {
                              handleToggleBlock(user);
                              setOpenDropdown(null);
                            }}
                          >
                            {user.isBlocked ? (
                              <>
                                <CheckCircle size={16} className="mr-2 text-green-600" />
                                Poista esto
                              </>
                            ) : (
                              <>
                                <Ban size={16} className="mr-2 text-orange-600" />
                                Estä käyttäjä
                              </>
                            )}
                          </button>
                          
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center"
                            onClick={() => {
                              handleSyncUser(user.id);
                              setOpenDropdown(null);
                            }}
                            disabled={syncing === user.id}
                          >
                            {syncing === user.id ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : (
                              <RefreshCw size={16} className="mr-2" />
                            )}
                            Synkronoi tiedot
                          </button>
                          
                          <div className="border-t border-gray-200"></div>
                          
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center text-red-600"
                            onClick={() => {
                              setDeleteUser(user);
                              setOpenDropdown(null);
                            }}
                          >
                            <Trash2 size={16} className="mr-2" />
                            Poista käyttäjä
                          </button>
                        </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setDeleteUser(null)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Poista Discord-käyttäjä
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Haluatko varmasti poistaa käyttäjän <strong>{deleteUser.name}</strong>?
                      </p>
                      {deleteUser._count?.tickets > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                          <p className="text-sm text-yellow-800">
                            Käyttäjällä on {deleteUser._count.tickets} tikettiä.
                          </p>
                          <label className="mt-2 flex items-center">
                            <input
                              type="checkbox"
                              checked={deleteTickets}
                              onChange={(e) => setDeleteTickets(e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Poista myös tiketit</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmDeleteUser}
                >
                  Poista
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteUser(null)}
                >
                  Peruuta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}