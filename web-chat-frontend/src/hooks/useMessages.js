import { useState, useEffect, useRef } from 'react';

export const useMessages = (socket, user, currentPartner) => {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (data) => {
      console.log('Message received:', data);
      setMessages(prev => [...prev, data]);
    });

    socket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.id !== data.id);
        return [...filtered, { id: data.id, username: data.username }];
      });
    });

    socket.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => prev.filter(u => u.id !== data.id));
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [socket]);

  const handleTyping = () => {
    if (!isTyping && currentPartner) {
      setIsTyping(true);
      socket.emit('typing_start');
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socket.emit('typing_stop');
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    typingUsers,
    isTyping,
    messagesEndRef,
    handleTyping,
    handleStopTyping,
    clearMessages
  };
};
