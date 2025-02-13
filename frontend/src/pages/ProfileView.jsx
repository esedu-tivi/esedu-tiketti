import React from 'react';
import NotificationSettings from '../components/Notifications/NotificationSettings';
import { useAuth } from '../providers/AuthProvider';

const ProfileView = () => {
  const { user, userRole } = useAuth();
  
  console.log('ProfileView - user:', user);
  console.log('ProfileView - userRole:', userRole);
  console.log('ProfileView - user?.role:', user?.role);

  const getRoleText = (role) => {
    console.log('getRoleText - input role:', role);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Profiilitiedot */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Profiili</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              userRole === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
              userRole === 'SUPPORT' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {getRoleText(userRole)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Nimi</label>
              <p className="mt-1 text-lg text-gray-900">{user?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Sähköposti</label>
              <p className="mt-1 text-lg text-gray-900">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Ilmoitusasetukset */}
        <NotificationSettings />
      </div>
    </div>
  );
};

export default ProfileView; 