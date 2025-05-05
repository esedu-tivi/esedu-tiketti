import React, { useState, useEffect } from 'react';
import { getNotificationSettings, updateNotificationSettings } from '../../utils/api';
import toast from 'react-hot-toast';
import { Bell, Mail, RefreshCw } from 'lucide-react';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    webNotifications: true,
    notifyOnAssigned: true,
    notifyOnStatusChange: true,
    notifyOnComment: true,
    notifyOnPriority: true,
    notifyOnMention: true,
    notifyOnDeadline: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getNotificationSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast.error('Ilmoitusasetusten hakeminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateNotificationSettings(settings);
      toast.success('Ilmoitusasetukset päivitetty');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Ilmoitusasetusten päivitys epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const renderToggle = (field, label, description, disabled = false, comingSoon = false) => {
    const isDisabled = disabled || (!settings.webNotifications && field !== 'webNotifications' && field !== 'emailNotifications');
    const tooltipText = !settings.webNotifications && field !== 'webNotifications' && field !== 'emailNotifications'
      ? 'Ota ensin selainilmoitukset käyttöön'
      : '';

    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 group relative p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 flex items-center flex-wrap gap-2">
            {label}
            {comingSoon && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Tulossa pian
              </span>
            )}
          </label>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {description}
          </p>
        </div>
        <div className="relative inline-block w-12 align-middle select-none flex-shrink-0">
          <input
            type="checkbox"
            checked={settings[field]}
            onChange={() => handleChange(field)}
            disabled={isDisabled}
            className={`toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              transform: settings[field] ? 'translateX(100%)' : 'translateX(0)',
              borderColor: settings[field] ? '#4F46E5' : '#D1D5DB'
            }}
          />
          <div className={`toggle-label block h-6 rounded-full transition-colors duration-200 ease-in-out ${
            settings[field] ? 'bg-indigo-600' : 'bg-gray-300'
          } ${isDisabled ? 'opacity-50' : ''}`}></div>
        </div>
        {tooltipText && (
          <div className="absolute right-0 mt-8 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {tooltipText}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const notificationTypes = [
    {
      field: 'notifyOnAssigned',
      label: 'Tiketti osoitetaan minulle',
      description: 'Saat ilmoituksen kun sinulle osoitetaan uusi tiketti',
      tooltip: 'Ilmoitus tulee kun tukihenkilö ottaa tikettisi käsittelyyn tai kun tiketti siirretään sinulle'
    },
    {
      field: 'notifyOnStatusChange',
      label: 'Tiketin tila muuttuu',
      description: 'Saat ilmoituksen kun tikettisi tila muuttuu',
      tooltip: 'Ilmoitus tulee kun tiketti merkitään ratkaistuksi, suljetaan tai avataan uudelleen'
    },
    {
      field: 'notifyOnComment',
      label: 'Uusi kommentti tikettiin',
      description: 'Saat ilmoituksen kun tikettiisi lisätään kommentti',
      tooltip: 'Ilmoitus tulee kun joku kommentoi tikettiin, jossa olet osallisena'
    },
    {
      field: 'notifyOnPriority',
      label: 'Tiketin prioriteetti muuttuu',
      description: 'Saat ilmoituksen kun tikettisi prioriteetti muuttuu',
      tooltip: 'Ilmoitus tulee kun tiketin kiireellisyysaste muuttuu'
    },
    {
      field: 'notifyOnMention',
      label: '@-maininta kommentissa',
      description: 'Saat ilmoituksen kun sinut mainitaan kommentissa (@käyttäjänimi)',
      tooltip: 'Ilmoitus tulee kun joku mainitsee sinut kommentissa @-merkillä'
    },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Yleiset ilmoitusasetukset */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-gray-700" />
            <h3 className="text-lg font-medium">Yleiset asetukset</h3>
          </div>
          <div className="space-y-3">

            {renderToggle(
              'webNotifications',
              'Selainilmoitukset',
              'Näytä ilmoitukset selaimessa',
              false
            )}
          </div>
        </div>

        {/* Ilmoitustyypit */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={18} className="text-gray-700" />
            <h3 className="text-lg font-medium">Ilmoita kun</h3>
          </div>
          <div className="space-y-3">
            {notificationTypes.map((type) => (
              <div key={type.field} className="group relative">
                {renderToggle(
                  type.field,
                  type.label,
                  type.description,
                  false,
                  type.comingSoon
                )}
                {type.tooltip && (
                  <div className="absolute left-0 mt-1 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    {type.tooltip}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          type="button"
          onClick={fetchSettings}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          Päivitä asetukset
        </button>
        
        <button
          type="submit"
          disabled={saving}
          className={`w-full sm:w-auto flex justify-center items-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            saving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Tallennetaan...
            </>
          ) : (
            'Tallenna asetukset'
          )}
        </button>
      </div>
    </form>
  );
};

export default NotificationSettings; 