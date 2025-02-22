import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BiBell } from 'react-icons/bi';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../utils/api';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { subscribe } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      console.log('Fetched notifications:', data);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      console.log('Fetched unread count:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const handleNewNotification = useCallback((notification) => {
    console.log('Handling new notification:', notification);
    
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        console.log('Notification already exists, skipping:', notification.id);
        return prev;
      }
      console.log('Adding new notification to state:', notification.id);
      return [notification, ...prev];
    });
    
    setUnreadCount(prev => {
      const newCount = prev + 1;
      console.log('Updated unread count:', newCount);
      return newCount;
    });
    
    toast(notification.content, {
      icon: '🔔',
    });
  }, []);

  // Set up WebSocket subscription
  useEffect(() => {
    console.log('Setting up WebSocket subscription');
    let cleanup = () => {};

    const setupSubscription = async () => {
      try {
        const unsubscribe = await subscribe('notification', (data) => {
          console.log('Received WebSocket notification:', data);
          handleNewNotification(data);
        });
        cleanup = unsubscribe;
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    // Initial setup
    setupSubscription();
    fetchNotifications();
    fetchUnreadCount();

    return () => {
      console.log('Cleaning up WebSocket subscription');
      cleanup();
    };
  }, [subscribe, handleNewNotification, fetchNotifications, fetchUnreadCount]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        console.log('Marked notification as read:', notification.id);
        
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    if (notification.ticketId) {
      const ticketUrl = `/tickets/${notification.ticketId}`;
      window.open(ticketUrl, '_blank');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      console.log('Marked all notifications as read');
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id, event) => {
    event.stopPropagation();
    try {
      await deleteNotification(id);
      console.log('Deleted notification:', id);
      
      const wasUnread = notifications.find(n => n.id === id && !n.read);
      setNotifications(prev =>
        prev.filter(n => n.id !== id)
      );
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <BiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Ilmoitukset</h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Merkitse kaikki luetuiksi
                </button>
              )}
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Ei ilmoituksia
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <p className={`text-sm ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(notification.createdAt), 'PPp', { locale: fi })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNotification(notification.id, e)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell; 