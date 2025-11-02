import React from 'react';

function Controls({ toggleAudio, toggleVideo, shareScreen }) {
  return (
    <div className="controls">
      <button onClick={toggleAudio}>Mute/Unmute</button>
      <button onClick={toggleVideo}>Video On/Off</button>
      <button onClick={shareScreen}>Share Screen</button>
    </div>
  );
}
export default Controls;