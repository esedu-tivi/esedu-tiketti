import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BiBell } from 'react-icons/bi';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../utils/api';
import { useNotifications } from '../../hooks/useNotifications';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { subscribe } = useSocket();
  const queryClient = useQueryClient();

  // Use centralized notifications hook
  const { 
    notifications, 
    unreadCount, 
    refetch: refetchAllNotifications,
    invalidate: invalidateNotifications 
  } = useNotifications();

  // Mutation for marking as read
  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      invalidateNotifications();
    },
  });

  // Mutation for marking all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      invalidateNotifications();
    },
  });

  // Mutation for deleting notification
  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      invalidateNotifications();
    },
  });

  const handleNewNotification = useCallback((notification) => {
    console.log('Handling new notification:', notification);
    
    // Optimistically update the cache
    queryClient.setQueryData(['notifications'], (old = []) => {
      // Check if notification already exists
      const exists = old.some(n => n.id === notification.id);
      if (exists) {
        console.log('Notification already exists, skipping:', notification.id);
        return old;
      }
      console.log('Adding new notification to cache:', notification.id);
      return [notification, ...old];
    });
    
    // Update unread count
    queryClient.setQueryData(['notifications', 'unread-count'], (old = 0) => {
      const newCount = old + 1;
      console.log('Updated unread count:', newCount);
      return newCount;
    });
    
    toast(notification.content, {
      icon: '🔔',
    });
  }, [queryClient]);

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

    setupSubscription();

    return () => {
      console.log('Cleaning up WebSocket subscription');
      cleanup();
    };
  }, [subscribe, handleNewNotification]);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TICKET_ASSIGNED':
        return '🎫';
      case 'TICKET_STATUS_CHANGED':
        return '📝';
      case 'TICKET_COMMENT':
        return '💬';
      case 'TICKET_MENTIONED':
        return '@';
      default:
        return '📢';
    }
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInHours = Math.floor((now - notificationDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
      if (diffInMinutes < 1) return 'Juuri nyt';
      return `${diffInMinutes} min sitten`;
    }
    if (diffInHours < 24) return `${diffInHours}h sitten`;
    if (diffInHours < 48) return 'Eilen';
    
    return format(notificationDate, 'd.M.yyyy', { locale: fi });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
        aria-label="Ilmoitukset"
      >
        <BiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Ilmoitukset</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                disabled={markAllAsReadMutation.isLoading}
              >
                Merkitse kaikki luetuiksi
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                Ei uusia ilmoituksia
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-normal'} text-gray-900 break-words`}>
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        disabled={deleteNotificationMutation.isLoading}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;