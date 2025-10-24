import { useState, useEffect } from 'react';

export const useVideoCall = (socket, currentPartner) => {
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Video call events
    socket.on('video_call_offer', () => {
      setIsVideoCallActive(true);
    });

    socket.on('video_call_end', () => {
      setIsVideoCallActive(false);
    });

    return () => {
      socket.off('video_call_offer');
      socket.off('video_call_end');
    };
  }, [socket]);

  const startVideoCall = () => {
    if (!currentPartner) return;
    setIsVideoCallActive(true);
  };

  const endVideoCall = () => {
    setIsVideoCallActive(false);
  };

  return {
    isVideoCallActive,
    startVideoCall,
    endVideoCall
  };
};

