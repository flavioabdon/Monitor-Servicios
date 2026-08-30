import { Server as SocketIO } from 'socket.io';

let io: SocketIO | null = null;

export function setSocketIO(instance: SocketIO) {
  io = instance;
}

export function emitCheckResult(serviceId: string, data: object) {
  if (!io) return;
  io.emit('check:result', { serviceId, ...data });
}

export function emitAlertUpdate(data: object) {
  if (!io) return;
  io.emit('alert:update', data);
}
