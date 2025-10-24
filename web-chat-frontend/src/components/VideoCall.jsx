import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VideoCall.css';

const VideoCall = ({ socket, currentPartner, user, onEndCall }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callStatus, setCallStatus] = useState(''); // 'connecting', 'connected', 'ended'
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Call duration timer
  useEffect(() => {
    if (isCallActive && callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      if (!isCallActive) {
        setCallDuration(0);
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isCallActive, callStatus]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initializePeerConnection = useCallback(() => {
    peerConnectionRef.current = new RTCPeerConnection(rtcConfig);

    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('video_call_ice_candidate', {
          targetUserId: currentPartner.id,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    peerConnectionRef.current.onconnectionstatechange = () => {
      const connectionState = peerConnectionRef.current.connectionState;
      console.log('Connection state:', connectionState);
      
      if (connectionState === 'connected') {
        setCallStatus('connected');
        setIsCallActive(true);
        setIsIncomingCall(false);
        setIsCalling(false);
      } else if (connectionState === 'disconnected' || connectionState === 'failed') {
        handleCallEnd();
      }
    };
  }, [socket, currentPartner]);

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add tracks to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, stream);
        });
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Unable to access camera and microphone. Please check permissions.');
      return null;
    }
  }, []);

  const handleCallEnd = useCallback(() => {
    console.log('Call ended');
    setIsCallActive(false);
    setIsIncomingCall(false);
    setIsCalling(false);
    setCallStatus('ended');
    setCallDuration(0);

    // Clean up
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  const handleIncomingOffer = useCallback(async (data) => {
    const { fromUserId, fromUsername, offer } = data;
    
    if (fromUserId !== currentPartner.id) return;

    setIsIncomingCall(true);
    setCallStatus('incoming');

    try {
      // Initialize peer connection
      initializePeerConnection();

      // Get local stream
      const stream = await getLocalStream();
      if (!stream) {
        setIsIncomingCall(false);
        return;
      }

      // Set remote description
      await peerConnectionRef.current.setRemoteDescription(offer);

      // Create answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Send answer to partner
      socket.emit('video_call_answer', {
        targetUserId: fromUserId,
        answer: answer
      });

      console.log('Call answer sent to', fromUsername);
    } catch (error) {
      console.error('Error handling incoming offer:', error);
      setIsIncomingCall(false);
    }
  }, [currentPartner, initializePeerConnection, getLocalStream, socket]);

  const handleIncomingAnswer = useCallback(async (data) => {
    const { fromUserId, answer } = data;
    
    if (fromUserId !== currentPartner.id) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(answer);
      console.log('Call answer received from', data.fromUsername);
    } catch (error) {
      console.error('Error handling incoming answer:', error);
    }
  }, [currentPartner]);

  const handleIncomingIceCandidate = useCallback(async (data) => {
    const { fromUserId, candidate } = data;
    
    if (fromUserId !== currentPartner.id) return;

    try {
      await peerConnectionRef.current.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, [currentPartner]);

  const handleCallReject = useCallback((data) => {
    console.log('Call rejected by', data.fromUsername);
    setIsIncomingCall(false);
    setIsCalling(false);
    setCallStatus('');
    alert('Call was rejected');
  }, []);

  useEffect(() => {
    if (!socket || !currentPartner) return;

    // Set up socket event listeners for WebRTC signaling
    socket.on('video_call_offer', handleIncomingOffer);
    socket.on('video_call_answer', handleIncomingAnswer);
    socket.on('video_call_ice_candidate', handleIncomingIceCandidate);
    socket.on('video_call_end', handleCallEnd);
    socket.on('video_call_reject', handleCallReject);

    return () => {
      // Clean up socket listeners
      socket.off('video_call_offer', handleIncomingOffer);
      socket.off('video_call_answer', handleIncomingAnswer);
      socket.off('video_call_ice_candidate', handleIncomingIceCandidate);
      socket.off('video_call_end', handleCallEnd);
      socket.off('video_call_reject', handleCallReject);
    };
  }, [socket, currentPartner, handleIncomingOffer, handleIncomingAnswer, handleIncomingIceCandidate, handleCallEnd, handleCallReject]);

  const startCall = async () => {
    if (!currentPartner) return;

    setIsCalling(true);
    setCallStatus('connecting');

    try {
      // Initialize peer connection
      initializePeerConnection();

      // Get local stream
      const stream = await getLocalStream();
      if (!stream) {
        setIsCalling(false);
        return;
      }

      // Create offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      // Send offer to partner
      socket.emit('video_call_offer', {
        targetUserId: currentPartner.id,
        offer: offer
      });

      console.log('Call offer sent to', currentPartner.username);
    } catch (error) {
      console.error('Error starting call:', error);
      setIsCalling(false);
      setCallStatus('');
    }
  };

  const answerCall = () => {
    setIsIncomingCall(false);
    setCallStatus('connecting');
  };

  const rejectCall = () => {
    socket.emit('video_call_reject', {
      targetUserId: currentPartner.id
    });
    setIsIncomingCall(false);
    setCallStatus('');
  };

  const endCall = () => {
    socket.emit('video_call_end', {
      targetUserId: currentPartner.id
    });
    handleCallEnd();
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  if (!currentPartner) return null;

  return (
    <div className="video-call-container">
      {/* Incoming Call Modal */}
      {isIncomingCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-modal">
            <div className="caller-info">
              <div className="caller-avatar">
                <span className="avatar-text">
                  {currentPartner.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="caller-name">{currentPartner.username}</h3>
              <p className="caller-status">Incoming video call</p>
            </div>
            <div className="call-actions">
              <button onClick={answerCall} className="answer-btn">
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99V19c0 .75.45.99.99.99h2.05c.54 0 .99-.45.99-.99 0-1.23.19-2.42.56-3.53.12-.35.03-.74-.24-1.01l-1.95-1.66c1.41-2.93 4.06-5.48 6.89-6.83l1.57 1.97c.27.28.66.36 1.01.24 1.11-.36 2.3-.56 3.53-.56.54 0 .99.45.99.99v2.05c0 .54-.45.99-.99.99z"/>
                </svg>
                Answer
              </button>
              <button onClick={rejectCall} className="reject-btn">
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                </svg>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call Interface - Only show when call is active */}
      {(isCallActive || isCalling || callStatus === 'connecting') && (
        <div className="video-call-interface">
          <div className="video-container">
            {/* Remote Video */}
            <div className="remote-video-container">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
              />
              <div className="remote-video-overlay">
                <div className="remote-user-info">
                  <div className="user-avatar">
                    <span className="avatar-text">
                      {currentPartner.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="user-details">
                    <h3 className="user-name">{currentPartner.username}</h3>
                    <p className="call-duration">{formatDuration(callDuration)}</p>
                  </div>
                </div>
                <div className="connection-status">
                  <div className={`status-indicator ${callStatus === 'connected' ? 'connected' : 'connecting'}`}></div>
                  <span className="status-text">
                    {callStatus === 'connecting' ? 'Connecting...' : 'Connected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Local Video */}
            <div className="local-video-container">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="local-video"
              />
              <div className="local-video-overlay">
                <div className="local-user-info">
                  <span className="local-label">You</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="call-controls">
            <div className="control-buttons">
              <button
                onClick={toggleAudio}
                className={`control-btn audio-btn ${isAudioEnabled ? 'active' : 'muted'}`}
                title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  {isAudioEnabled ? (
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  ) : (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  )}
                </svg>
              </button>

              <button
                onClick={toggleVideo}
                className={`control-btn video-btn ${isVideoEnabled ? 'active' : 'muted'}`}
                title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  {isVideoEnabled ? (
                    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                  ) : (
                    <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2zM5 16V8h1.73l8 8H5z"/>
                  )}
                </svg>
              </button>

              <button
                onClick={endCall}
                className="control-btn end-call-btn"
                title="End Call"
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.88-.14.14-.33.22-.53.22-.2 0-.39-.08-.53-.22L2.22 13.5c-.14-.14-.22-.33-.22-.53 0-.2.08-.39.22-.53.79-.76 1.68-1.39 2.66-1.88.33-.16.56-.51.56-.9v-3.1C6.85 9.25 8.4 9 10 9s3.15.25 4.6.72v3.1c0 .39.23.74.56.9.98.49 1.87 1.12 2.66 1.88.14.14.33.22.53.22.2 0 .39-.08.53-.22l1.9-1.9c.14-.14.22-.33.22-.53 0-.2-.08-.39-.22-.53-.79-.76-1.68-1.39-2.66-1.88-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Call Button (when not in call) */}
      {!isCallActive && !isCalling && !isIncomingCall && callStatus !== 'connecting' && (
        <div className="start-call-section">
          <button
            onClick={startCall}
            className="start-call-btn"
            disabled={!currentPartner}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
            <span className="btn-text">Start Video Call</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;