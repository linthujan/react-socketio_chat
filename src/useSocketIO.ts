import { DefaultEventsMap } from '@socket.io/component-emitter';
import { useState } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocketIO = () => {
    const [socket, setSocket] = useState<Socket<DefaultEventsMap, DefaultEventsMap>>();

    const initSocket = (token: string) => {
        // console.log(`token`, token);

        if (!socket) {
            const newSocket = io(process.env.BACKEND_URL!, {
                autoConnect: false,
                extraHeaders: {
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                auth: {
                    chatOffset: 0,
                },
            });
            setSocket(newSocket);
        }
    }

    return { socket, initSocket };
}

export default useSocketIO;