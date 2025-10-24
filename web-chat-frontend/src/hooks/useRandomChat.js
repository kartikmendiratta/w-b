import { useState, useEffect } from 'react';
import { message } from 'antd';

export const useRandomChat = (socket, user) => {
  const [currentPartner, setCurrentPartner] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [showTopicSelector, setShowTopicSelector] = useState(false);

  const availableTopics = [
    'Technology', 'Gaming', 'Music', 'Sports', 'Movies', 'Books', 
    'Travel', 'Food', 'Art', 'Science', 'Politics', 'Fashion',
    'Photography', 'Fitness', 'Cooking', 'Nature', 'History', 'Philosophy'
  ];

  useEffect(() => {
    if (!socket) return;

    // Random chat events
    socket.on('searching', (data) => {
      setIsSearching(true);
      message.loading(data.message, 0);
    });

    socket.on('chat_found', (data) => {
      setIsSearching(false);
      setCurrentPartner(data.partner);
      message.destroy();
      message.success(`Matched with ${data.partner.username}!`);
    });

    socket.on('partner_left', () => {
      setCurrentPartner(null);
      setIsSearching(false);
      message.destroy();
      message.info('Your chat partner left the conversation');
    });

    socket.on('error', (data) => {
      message.error(data.message);
    });

    return () => {
      socket.off('searching');
      socket.off('chat_found');
      socket.off('partner_left');
      socket.off('error');
    };
  }, [socket]);

  const startRandomChat = () => {
    if (!socket) return;
    
    if (selectedTopics.length > 0) {
      setShowTopicSelector(true);
    } else {
      socket.emit('find_chat', { preferredTopics: selectedTopics });
    }
  };

  const handleTopicSelection = () => {
    setShowTopicSelector(false);
    socket.emit('find_chat', { preferredTopics: selectedTopics });
  };

  const endRandomChat = () => {
    if (!socket) return;
    
    socket.emit('leave_chat');
    setCurrentPartner(null);
    setIsSearching(false);
    message.destroy();
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  return {
    currentPartner,
    isSearching,
    selectedTopics,
    showTopicSelector,
    availableTopics,
    startRandomChat,
    handleTopicSelection,
    endRandomChat,
    toggleTopic,
    setShowTopicSelector
  };
};

