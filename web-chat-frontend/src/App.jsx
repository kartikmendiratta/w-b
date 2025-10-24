import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Chat from './components/Chat.jsx';
import Rooms from './components/Rooms.jsx';
import RoomChat from './components/RoomChat.jsx';
import Profile from './components/Profile.jsx';
import './App.css';

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'rooms', 'room-chat', 'profile'

  useEffect(() => {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentRoom(null);
    setCurrentView('chat');
  };

  const handleJoinRoom = (room) => {
    console.log('App: Joining room:', room);
    setCurrentRoom(room);
    setCurrentView('room-chat');
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setCurrentView('rooms');
  };

  const handleShowRooms = () => {
    setCurrentView('rooms');
  };

  const handleShowChat = () => {
    setCurrentView('chat');
  };

  const handleShowProfile = () => {
    setCurrentView('profile');
  };

  const handleBackFromProfile = () => {
    setCurrentView('chat');
  };

  const renderMainContent = () => {
    console.log('App: Rendering view:', currentView, 'Room:', currentRoom);
    
    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    switch (currentView) {
      case 'rooms':
        return <Rooms user={user} onLogout={handleLogout} onJoinRoom={handleJoinRoom} onShowChat={handleShowChat} />;
      case 'room-chat':
        return <RoomChat user={user} room={currentRoom} onLeaveRoom={handleLeaveRoom} />;
      case 'profile':
        return <Profile user={user} onLogout={handleLogout} onBack={handleBackFromProfile} />;
      case 'chat':
      default:
        return <Chat user={user} onLogout={handleLogout} onShowRooms={handleShowRooms} onShowProfile={handleShowProfile} />;
    }
  };

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={renderMainContent()}
          />
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;