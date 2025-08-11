import { FC } from 'react';
import { Notification as NotificationType } from '../types';

type NotificationProps = NotificationType;

export const Notification: FC<NotificationProps> = ({ message, type }) => (
  <div className={`fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse ${
    type === 'success' ? 'bg-green-500' :
    type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white`}>
    {message}
  </div>
);