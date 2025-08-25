import { useState, useEffect } from 'react';
import { Alert } from '../ui/Alert';
import { useUsers } from '../../hooks/useUsers';
import { useUpdateUserRole } from '../../hooks/useRoleChange';
import { Search, RefreshCw } from 'lucide-react';

export default function UserManagementDialog({ isOpen, onClose }) {
  const { data: fetchedUsers, isLoading, error: fetchError, refetch } = useUsers();
  const { mutate: updateUserRole, isLoading: isUpdating } = useUpdateUserRole();
  
  const [users, setUsers] = useState([]);
  const [modifiedUsers, setModifiedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && fetchedUsers) {
      setUsers(fetchedUsers);
      setModifiedUsers(fetchedUsers);
    }
  }, [isOpen, fetchedUsers]);

  const loadUsers = () => {
    refetch();
  };

  const handleRoleChange = (userId, isSupport) => {
    setModifiedUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId
          ? { ...user, role: isSupport ? 'SUPPORT' : 'USER' }
          : user,
      ),
    );
  };

  const hasChanges = () => {
    return JSON.stringify(users) !== JSON.stringify(modifiedUsers);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Etsi muuttuneet käyttäjät
      const changedUsers = modifiedUsers.filter((modifiedUser) => {
        const originalUser = users.find((u) => u.id === modifiedUser.id);
        return originalUser && originalUser.role !== modifiedUser.role;
      });

      // Päivitä roolit käyttäen hook-muutaatiota
      for (const user of changedUsers) {
        await updateUserRole({ userId: user.id, newRole: user.role });
      }
      
      // Update the original users list after successful save
      setUsers(modifiedUsers);
    } finally {
      setSaving(false);
    }
    
    // Hook hoitaa automaattisesti queryClient.invalidateQueries(['users'])
  };

  const handleCancel = () => {
    setModifiedUsers(users);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
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
        return role;
    }
  };

  // Small badge component for jobTitle
  const JobTitleBadge = ({ jobTitle }) => {
    if (!jobTitle) return null;
    
    return (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
        {jobTitle}
      </span>
    );
  };

  // Filter users based on search query
  const filteredUsers = modifiedUsers.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) || 
      user.email?.toLowerCase().includes(query) ||
      user.jobTitle?.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-h-[90vh] rounded-lg bg-white p-4 md:p-6 shadow-xl overflow-y-auto max-w-xs sm:max-w-md md:max-w-2xl">
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold">Käyttäjien hallinta</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadUsers} 
              disabled={isLoading}
              className="rounded p-2 hover:bg-gray-100 disabled:opacity-50"
              title="Päivitä käyttäjälista"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="rounded p-2 hover:bg-gray-100">
              ✕
            </button>
          </div>
        </div>

        {fetchError && (
          <Alert
            variant="error"
            title="Virhe"
            message={fetchError.message || 'Käyttäjien lataaminen epäonnistui'}
            className="mb-4"
          />
        )}

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Hallitse opiskelijoiden ja tukihenkilöiden käyttöoikeuksia.
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-4 relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full py-2 pl-10 pr-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Etsi käyttäjiä nimellä, sähköpostilla tai ryhmällä..."
              value={searchQuery}
              onChange={handleSearch}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-500">
              {filteredUsers.length === 0 ? (
                <span>Ei tuloksia hakusanalla "{searchQuery}"</span>
              ) : (
                <span>Löytyi {filteredUsers.length} käyttäjää</span>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            {/* Table for medium and larger screens */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-left">
                    <th className="pb-2">Käyttäjänimi</th>
                    <th className="pb-2">Sähköposti</th>
                    <th className="pb-2 text-center">Käyttölupa</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-3">
                          <div className="flex items-center">
                            <span>{user.name}</span>
                            <JobTitleBadge jobTitle={user.jobTitle} />
                          </div>
                        </td>
                        <td className="py-3">{user.email}</td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <input
                              type="checkbox"
                              checked={user.role === 'SUPPORT'}
                              onChange={(e) =>
                                handleRoleChange(user.id, e.target.checked)
                              }
                              disabled={user.role === 'ADMIN' || saving}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="inline-block min-w-[100px] text-sm text-gray-500">
                              ({getRoleText(user.role)})
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-4 text-center text-gray-500">
                        Ei käyttäjiä tai hakutuloksia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Card layout for mobile screens */}
            <div className="sm:hidden space-y-4">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="font-medium flex items-center flex-wrap">
                      <span>{user.name}</span>
                      <JobTitleBadge jobTitle={user.jobTitle} />
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{user.email}</div>
                    <div className="flex items-center mt-2">
                      <span className="text-sm mr-2">Tukihenkilö:</span>
                      <input
                        type="checkbox"
                        checked={user.role === 'SUPPORT'}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.checked)
                        }
                        disabled={user.role === 'ADMIN' || saving}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="inline-block ml-2 text-sm text-gray-500">
                        ({getRoleText(user.role)})
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-gray-500">
                  Ei käyttäjiä tai hakutuloksia.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end sm:space-x-4 space-y-2 sm:space-y-0">
          <button
            onClick={handleCancel}
            disabled={saving || !hasChanges()}
            className={`rounded-md border border-gray-300 px-4 py-2 text-sm font-medium shadow-sm transition-opacity ${
              hasChanges()
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'pointer-events-none hidden sm:inline-block sm:opacity-0'
            } disabled:opacity-50 order-2 sm:order-1`}
          >
            Peru muutokset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className={`rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm transition-opacity ${
              hasChanges()
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'pointer-events-none hidden sm:inline-block sm:opacity-0'
            } disabled:opacity-50 order-1 sm:order-2`}
          >
            {saving ? 'Tallennetaan...' : 'Tallenna muutokset'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 order-3"
          >
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
}
