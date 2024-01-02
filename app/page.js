"use client"
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [findingMessage, setFindingMessage] = useState('');
  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const videoRefLocal = useRef();
  const videoRefRemote = useRef();
  const socket = io.connect('http://localhost:3001');

  useEffect(() => {
    const initializeUserMedia = async () => {
      try {
        const userMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userMedia);
        videoRefLocal.current.srcObject = userMedia;
      } catch (error) {
        console.error('Error accessing user media:', error.message);
      }
    };

    initializeUserMedia();

    // Listen for messages from the server
    socket.on('message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Signaling for WebRTC
    socket.on('offer', (offer) => {
      const newPeer = new SimplePeer({ initiator: false, trickle: false, stream });

      newPeer.on('signal', (data) => {
        socket.emit('answer', { target: offer.sender, answer: data });
      });

      newPeer.on('data', (data) => {
        setMessages((prevMessages) => [...prevMessages, { text: data.toString(), own: false }]);
      });

      newPeer.on('stream', (remoteStream) => {
        // Display the remote stream in the remote video element
        videoRefRemote.current.srcObject = remoteStream;
      });

      newPeer.signal(offer.data);
      setPeers((prevPeers) => [...prevPeers, newPeer]);
    });

    socket.on('answer', (answer) => {
      const peer = peers.find((p) => p.target === answer.sender);
      peer.signal(answer.data);
    });

    socket.on('ice-candidate', (candidate) => {
      const peer = peers.find((p) => p.target === candidate.sender);
      peer.addIceCandidate(candidate.data);
    });

    // Handle "Finding..." message
    socket.on('finding-message', (message) => {
      setFindingMessage(message);
    });

    // Handle "Not able to connect" message
    socket.on('not-connect-message', (message) => {
      setFindingMessage(message);
      setTimeout(() => setFindingMessage(''), 3000); // Clear message after 3 seconds
    });

    // Clean up the socket connection on component unmount
    return () => {
      socket.disconnect();
      peers.forEach((peer) => peer.destroy());
    };
  }, [peers]);

  const sendMessage = () => {
    // Send the message to all connected peers
    peers.forEach((peer) => peer.send(messageInput));

    // Update the local state
    setMessages((prevMessages) => [...prevMessages, { text: messageInput, own: true }]);
    setMessageInput('');
  };

  const startVideoChat = () => {
    setFindingMessage('Finding...');

    // Notify the server to find a random user for video chat
    socket.emit('start-video-chat');
  };

  const endVideoChat = () => {
    // End the ongoing video chats and clean up
    peers.forEach((peer) => peer.destroy());
    setPeers([]);
    setFindingMessage('');
  };

  return (
    <div>

{/* <div className="flex flex-col lg:flex-row">
      <div className="h-[35vh] lg:h-[70vh] lg:w-1/2 bg-slate-200"></div>
      <div className="h-[35vh] lg:h-[70vh] lg:w-1/2  bg-slate-400"></div>
    </div>
    <div className="p-[2vh] flex gap-2"> 
      <button className="bg-gray-500 text-white p-[4vh] text-[5vh] hover:bg-orange-500 focus:bg-orange-800">Start</button>
      <button className="bg-black text-white p-[4vh] text-[5vh] hover:bg-orange-500 focus:bg-orange-800">Stop</button>
    </div> */}
   <div>
      <div>
        <ul>
          {messages.map((msg, index) => (
            <li key={index} className={msg.own ? 'own' : ''}>
              {msg.text}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <div>
        <div>
          <video ref={videoRefLocal} autoPlay muted />
        </div>
        <div>
          <video ref={videoRefRemote} autoPlay />
        </div>
        {!peers.length && <button onClick={startVideoChat}>Start Video Chat</button>}
        {findingMessage && <p>{findingMessage}</p>}
        {!!peers.length && <button onClick={endVideoChat}>Stop Video Chat</button>}
      </div>
    </div>
    </div>

  );
}
