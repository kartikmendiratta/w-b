# Custom Hooks

This folder contains custom React hooks that provide reusable logic for the WebChat application.

## Available Hooks

### `useSocket(user)`
Manages socket connection and connection status.

**Returns:**
- `socket` - Socket.io instance
- `isConnected` - Boolean indicating connection status

**Usage:**
```jsx
const { socket, isConnected } = useSocket(user);
```

### `useRandomChat(socket, user)`
Handles random chat functionality including partner matching and topic selection.

**Returns:**
- `currentPartner` - Current chat partner object
- `isSearching` - Boolean indicating if searching for partner
- `selectedTopics` - Array of selected interest topics
- `showTopicSelector` - Boolean for topic selector modal visibility
- `availableTopics` - Array of available topic options
- `startRandomChat()` - Function to start random chat
- `handleTopicSelection()` - Function to handle topic selection
- `endRandomChat()` - Function to end current chat
- `toggleTopic(topic)` - Function to toggle topic selection
- `setShowTopicSelector(boolean)` - Function to control topic selector visibility

**Usage:**
```jsx
const {
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
} = useRandomChat(socket, user);
```

### `useMessages(socket, user, currentPartner)`
Manages message state, typing indicators, and message-related functionality.

**Returns:**
- `messages` - Array of message objects
- `typingUsers` - Array of users currently typing
- `isTyping` - Boolean indicating if current user is typing
- `messagesEndRef` - Ref for auto-scrolling to bottom
- `handleTyping()` - Function to handle typing start
- `handleStopTyping()` - Function to handle typing stop
- `clearMessages()` - Function to clear all messages

**Usage:**
```jsx
const {
  messages,
  typingUsers,
  isTyping,
  messagesEndRef,
  handleTyping,
  handleStopTyping,
  clearMessages
} = useMessages(socket, user, currentPartner);
```

### `useVideoCall(socket, currentPartner)`
Manages video call state and functionality.

**Returns:**
- `isVideoCallActive` - Boolean indicating if video call is active
- `startVideoCall()` - Function to start video call
- `endVideoCall()` - Function to end video call

**Usage:**
```jsx
const {
  isVideoCallActive,
  startVideoCall,
  endVideoCall
} = useVideoCall(socket, currentPartner);
```

## Benefits

- **Modularity**: Each hook handles a specific concern
- **Reusability**: Hooks can be used across different components
- **Testability**: Hooks can be tested independently
- **Maintainability**: Logic is organized and easy to update
- **Clean Components**: Components focus on rendering, not business logic

## Example Usage in Component

```jsx
import React, { useState } from 'react';
import { useSocket, useRandomChat, useMessages, useVideoCall } from '../hooks';

const ChatComponent = ({ user, onLogout, onShowRooms }) => {
  const [inputMessage, setInputMessage] = useState('');
  
  // Use custom hooks
  const { socket, isConnected } = useSocket(user);
  const { currentPartner, isSearching, startRandomChat, endRandomChat } = useRandomChat(socket, user);
  const { messages, typingUsers, handleTyping, handleStopTyping } = useMessages(socket, user, currentPartner);
  const { isVideoCallActive, startVideoCall, endVideoCall } = useVideoCall(socket, currentPartner);

  // Component logic here...
};
```

