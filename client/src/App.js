import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");
const roomId = "room1";

export default function App() {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const pc = useRef(null);
  const [stream, setStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);

  useEffect(() => {
    initCall();
  }, []);

  const initCall = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setStream(mediaStream);
    localVideoRef.current.srcObject = mediaStream;

    pc.current = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    mediaStream.getTracks().forEach((track) => pc.current.addTrack(track, mediaStream));

    pc.current.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { roomId, candidate: e.candidate });
    };

    pc.current.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    socket.emit("join-room", roomId);

    // When another user joins, first one becomes initiator
    socket.on("ready", async () => {
      setIsInitiator(true);
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.emit("offer", { roomId, sdp: offer });
    });

    socket.on("offer", async (sdp) => {
      if (!isInitiator) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        socket.emit("answer", { roomId, sdp: answer });
      }
    });

    socket.on("answer", async (sdp) => {
      await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    socket.on("ice-candidate", async (candidate) => {
      if (candidate) {
        try {
          await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error(err);
        }
      }
    });

    socket.on("chat-message", (msg) => setChat((prev) => [...prev, msg]));
  };

  // Controls
  const toggleMic = () => {
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleCam = () => {
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn((prev) => !prev);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const msg = { text: message, sender: "Me" };
    socket.emit("chat-message", msg);
    setChat((prev) => [...prev, msg]);
    setMessage("");
  };

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getTracks()[0];
      const sender = pc.current.getSenders().find((s) => s.track.kind === "video");
      sender.replaceTrack(screenTrack);

      screenTrack.onended = () => {
        sender.replaceTrack(stream.getVideoTracks()[0]);
      };
    } catch (err) {
      console.error("Screen share failed", err);
    }
  };

  // UI
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0b0f19",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", marginTop: 10 }}>Realtime Communication App</h2>

      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "2rem",
          padding: "1rem",
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "45%",
            borderRadius: 10,
            background: "#000",
            transform: "scaleX(-1)",
          }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: "45%",
            borderRadius: 10,
            background: "#000",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1.5rem",
          marginBottom: "1rem",
        }}
      >
        <button onClick={toggleMic} style={buttonStyle(micOn ? "#2ecc71" : "#e74c3c")}>
          {micOn ? "🎤 Mute" : "🔇 Unmute"}
        </button>
        <button onClick={toggleCam} style={buttonStyle(camOn ? "#2ecc71" : "#e74c3c")}>
          {camOn ? "📷 Camera Off" : "📸 Camera On"}
        </button>
        <button onClick={shareScreen} style={buttonStyle("#3498db")}>
          🖥️ Share Screen
        </button>
        <button onClick={() => setShowChat((p) => !p)} style={buttonStyle("#9b59b6")}>
          💬 Chat
        </button>
      </div>

      {showChat && (
        <div
          style={{
            background: "#1c2230",
            height: "250px",
            overflowY: "auto",
            padding: "1rem",
            borderTop: "1px solid #333",
          }}
        >
          <div
            style={{
              height: "180px",
              overflowY: "auto",
              marginBottom: "10px",
            }}
          >
            {chat.map((msg, i) => (
              <div key={i} style={{ marginBottom: "6px" }}>
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: "none",
                outline: "none",
              }}
            />
            <button onClick={sendMessage} style={buttonStyle("#2ecc71")}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle = (color) => ({
  background: color,
  border: "none",
  color: "white",
  padding: "10px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "500",
  transition: "all 0.2s",
});
