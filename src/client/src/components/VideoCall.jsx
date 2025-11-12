import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import { Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import './VideoCall.css';

// Initialize socket outside component to prevent multiple connections
const socket = io('http://localhost:5001', {
  transports: ['websocket'],
  cors: {
    origin: "http://localhost:5174"
  }
});

function VideoCall() {
  const [me, setMe] = useState('');
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false); // Track if the user has joined the room
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('me', (id) => {
      setMe(id);
    });

    socket.on('callUser', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });

    return () => {
      socket.off('me');
      socket.off('callUser');
      socket.off('connect_error');
    };
  }, []);

  const joinRoom = () => {
    if (!name || !roomId) {
      alert("Please enter your name and room ID.");
      return;
    }

    socket.emit('joinRoom', roomId);
    setJoinedRoom(true);

    // Access media devices after joining the room
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((currentStream) => {
          setStream(currentStream);
          if (myVideo.current) {
            myVideo.current.srcObject = currentStream;
          }
        })
        .catch((err) => {
          console.error("Error accessing media devices:", err);
        });
    }
  };

  const callUser = () => {
    if (!stream) {
      console.error('Stream not available');
      return;
    }

    console.log('Calling user with:', { roomId, me, name, stream });

    try {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
        // REMOVE wrtc property here!
      });

      peer.on('error', (err) => console.error('Peer error:', err));

      peer.on('signal', (data) => {
        socket.emit('callUser', {
          userToCall: roomId,
          signalData: data,
          from: me,
          name: name
        });
      });

      peer.on('stream', (remoteStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      socket.on('callAccepted', (signal) => {
        setCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    } catch (error) {
      console.error('Error creating peer:', error);
    }
  };

  const answerCall = () => {
    setCallAccepted(true);
    setReceivingCall(false);
    try {
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peer.on('signal', (data) => {
        socket.emit('answerCall', { signal: data, to: caller });
      });

      peer.on('stream', (remoteStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = remoteStream;
        }
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const leaveCall = () => {
    setCallEnded(true);
    setCallAccepted(false);
    setReceivingCall(false);
    setCaller('');
    setCallerSignal(null);

    if (connectionRef.current) {
        connectionRef.current.destroy();
    }

    // Stop media tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Reset state to allow joining a new room
    setStream(null);
    setJoinedRoom(false);
    // Keep name and room ID if you want to allow easy re-joining
    // setName('');
    // setRoomId('');
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  return (
    <div className="videocall-container">
      {!joinedRoom ? (
        <div className="lobby-container">
          <h1 className="videocall-title">Video Call</h1>
          <div className="room-controls">
            <input
              type="text"
              className="input-field"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button className="btn btn-primary" onClick={joinRoom}>
              Join Meeting
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="videos-container">
            <div className="video-paper">
              <video playsInline muted ref={myVideo} autoPlay className="video-player" style={{ display: isVideoOn ? 'block' : 'none' }} />
              {!isVideoOn && <div className="video-off-placeholder">{name}</div>}
              <p className="video-name-tag">You ({name})</p>
            </div>

            {callAccepted && !callEnded ? (
              <div className="video-paper">
                <video playsInline ref={userVideo} autoPlay className="video-player" />
                <p className="video-name-tag">Caller</p>
              </div>
            ) : (
              <div className="video-paper placeholder-paper">
                <div className="waiting-text">Waiting for others to join...</div>
              </div>
            )}
          </div>

          <div className="call-controls">
            <button className={`btn btn-icon ${!isAudioOn ? 'btn-off' : ''}`} onClick={toggleAudio}>
              {isAudioOn ? <Phone /> : <PhoneOff />}
            </button>
            <button className={`btn btn-icon ${!isVideoOn ? 'btn-off' : ''}`} onClick={toggleVideo}>
              {isVideoOn ? <Video /> : <VideoOff />}
            </button>

            {callAccepted && !callEnded ? (
              <button className="btn btn-secondary btn-end-call" onClick={leaveCall}>
                <PhoneOff /> End Call
              </button>
            ) : (
              <button className="btn btn-primary" onClick={callUser} disabled={!stream}>
                <Phone /> Call
              </button>
            )}
            {!callAccepted && (
              <button className="btn btn-secondary" onClick={leaveCall}>
                Leave
              </button>
            )}
          </div>
        </>
      )}

      {receivingCall && !callAccepted && (
        <div className="call-notification">
          <p><strong>{name || 'Someone'}</strong> is calling...</p>
          <button className="btn btn-primary" onClick={answerCall}>
            Answer
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCall;