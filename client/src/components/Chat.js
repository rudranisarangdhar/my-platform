import React, { useState } from 'react';

function Chat({ messages, sendMessage }) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <h3>Chat</h3>
      <div className="messages">
        {messages.map((msg, index) => (
          <p key={index}><strong>{msg.senderId === 'me' ? 'Me' : 'Peer'}:</strong> {msg.message}</p>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
export default Chat;