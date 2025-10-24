import React from 'react';
import './Navbar.css';

const Navbar = ({ user, isConnected, onShowRooms, onLogout, onShowProfile }) => {

  return (
    <div className="navbar">
      <div className="navbar-content">
        <div className="user-info">
          <div className="app-logo-container">
            <img 
              src="/webchat-logo.svg" 
              alt="WebChat" 
              className="app-logo"
            />
          </div>
          <div className="user-details">
            <h4 className="app-title">
              WebChat
            </h4>
            <div className="connection-status">
              <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span className="welcome-text">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        <div className="navbar-actions">
          <button 
            className="rooms-btn"
            onClick={onShowRooms}
          >
            🏠 Rooms
          </button>
          <div className="dropdown">
            <button className="user-menu-btn">
              ⋮
            </button>
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={onShowProfile}>
                👤 Profile
              </button>
              <button className="dropdown-item" onClick={onShowRooms}>
                🏠 View Rooms
              </button>
              
              <div className="dropdown-divider"></div>
              <button className="dropdown-item danger" onClick={onLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
