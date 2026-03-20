import { io } from "socket.io-client";

const socketBase = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;

let socket;

export const connectSocket = (token) => {
  if (!socketBase || !token) return null;
  if (socket) return socket;

  socket = io(socketBase, {
    transports: ["websocket", "polling"],
    auth: { token },
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
