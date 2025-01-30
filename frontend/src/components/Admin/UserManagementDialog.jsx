import { useState, useEffect } from 'react';
import axios from 'axios';
import { Alert } from '../ui/Alert';
import { authService } from '../../services/authService';

export default function UserManagementDialog({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [modifiedUsers, setModifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = await authService.acquireToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setModifiedUsers(response.data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Käyttäjien lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId, isSupport) => {
    setModifiedUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId
          ? { ...user, role: isSupport ? 'SUPPORT' : 'USER' }
          : user
      )
    );
  };

  const hasChanges = () => {
    return JSON.stringify(users) !== JSON.stringify(modifiedUsers);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await authService.acquireToken();
      
      // Etsi muuttuneet käyttäjät
      const changedUsers = modifiedUsers.filter(modifiedUser => {
        const originalUser = users.find(u => u.id === modifiedUser.id);
        return originalUser.role !== modifiedUser.role;
      });

      // Päivitä kaikki muuttuneet käyttäjät
      await Promise.all(
        changedUsers.map(user =>
          axios.put(
            `${import.meta.env.VITE_API_URL}/users/${user.id}/role`,
            { role: user.role },
            { headers: { Authorization: `Bearer ${token}` }}
          )
        )
      );

      // Päivitä käyttäjälista
      await loadUsers();
    } catch (err) {
      console.error('Error updating user roles:', err);
      setError('Roolien päivitys epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setModifiedUsers(users);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Käyttäjien hallinta</h2>
          <button
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <Alert
            variant="error"
            title="Virhe"
            message={error}
            className="mb-4"
          />
        )}

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Hallitse opiskelijoiden ja tukihenkilöiden käyttöoikeuksia.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left">
                  <th className="pb-2">Käyttäjänimi</th>
                  <th className="pb-2">Sähköposti</th>
                  <th className="pb-2 text-center">Käyttölupa</th>
                </tr>
              </thead>
              <tbody>
                {modifiedUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-3">{user.name}</td>
                    <td className="py-3">{user.email}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          type="checkbox"
                          checked={user.role === 'SUPPORT'}
                          onChange={(e) => handleRoleChange(user.id, e.target.checked)}
                          disabled={user.role === 'ADMIN' || saving}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="inline-block min-w-[100px] text-sm text-gray-500">
                          ({getRoleText(user.role)})
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={handleCancel}
            disabled={saving || !hasChanges()}
            className={`rounded-md border border-gray-300 px-4 py-2 text-sm font-medium shadow-sm transition-opacity ${
              hasChanges() 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : 'pointer-events-none opacity-0'
            } disabled:opacity-50`}
          >
            Peru muutokset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className={`rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm transition-opacity ${
              hasChanges()
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'pointer-events-none opacity-0'
            } disabled:opacity-50`}
          >
            {saving ? 'Tallennetaan...' : 'Tallenna muutokset'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Sulje
          </button>
        </div>
      </div>
    </div>
  );
} 