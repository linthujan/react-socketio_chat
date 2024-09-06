import { Fragment, MouseEvent, useEffect, useState } from 'react'
import './App.css'
import useSocketIO from './useSocketIO';
import axios from 'axios';
import { Bounce, toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const baseurl = process.env.BACKEND_URL;

function App() {
  const [user, setUser] = useState<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [email, setEmail] = useState<string>("admin@gmail.com");
  const [message, setMessage] = useState<string>();
  const [token, setToken] = useState<string>();
  const [chat, setChat] = useState<any>();
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [typingId, setTypingId] = useState<string>();
  const { socket, initSocket } = useSocketIO();

  useEffect(() => {
    const userString = localStorage.getItem('user');
    const userData = userString ? JSON.parse(userString) : null;

    if (userData) {
      setUser(userData.user);
      setEmail(userData.user.email);
      setToken(userData.token);
      getChats(userData.token);
      initSocket(userData.token);
    }

    const chatString = localStorage.getItem('chat');
    const chatData = chatString ? JSON.parse(chatString) : null;

    if (chatData) {
      getChat(chatData, userData.token);
    }
  }, []);

  useEffect(() => {
    if (socket?.id) {
      // console.log(`socketID :`, socket.id);
    }
    else if (socket) {
      socket.on('connect', () => {
        console.log('connected, ID :', socket.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('disconnected, reason :', reason);
      });

      socket.on('message', (data) => {
        data['fromSelf'] = data.user_id == user.user_id;
        console.log(`event : message`, data);

        setMessages((prev: any[]) => ([...prev, data]));
      });

      socket.on('typing', (user_id) => {
        setTypingId(user_id);
      });
    }
  }, [socket]);

  useEffect(() => {
    if (typingId) {
      const user = users.find(u => u.user_id == typingId);
      toast.info(`${user.username[0].toUpperCase()}${user.username.slice(1)} is typing...`);
      setTypingId(undefined);
    }
  }, [typingId]);

  async function login(e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    e.preventDefault();
    if (!email) {
      alert('No email');
      return;
    }

    const loginData = await loginWithMail(email);
    setUser(loginData.user);
    setToken(loginData.token);
    getChats(loginData.token);
    initSocket(loginData.token);

    localStorage.setItem("user", JSON.stringify(loginData));
  }

  function typing(event: React.FormEvent<HTMLInputElement>) {
    if (!socket) {
      event.preventDefault();
      return;
    }

    console.log(`sent typing`);
    socket.emit('typing', chat.chat_id);
  }

  function selectChat(event: React.ChangeEvent<HTMLInputElement>) {
    getChat(event.target.value, token!);
    localStorage.setItem("chat", JSON.stringify(event.target.value));
  }

  function sendMessage(event: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) {
    event.preventDefault();
    if (!socket) {
      alert("Socket not connected");
      return;
    }
    if (!chat) {
      alert("Chat not selected");
      return;
    }

    socket.emit('send_message', chat.chat_id, {
      text: message,
      type: "text",
    });
    setMessage("");
  }

  function connect() {
    if (!socket) return;
    socket.connect();
  }

  function disconnect() {
    if (!socket) return;
    socket.disconnect();
  }

  async function loginWithMail(email: string): Promise<{ user: any; token: string; }> {
    const response = await axios.post(`${baseurl}/api/auth/login`, {
      email,
      password: "12345678",
      recaptcha_verified: true,
    });

    return response.data.data;
  }

  async function getChat(chat_id: string, token: string) {
    const response = await axios.get(`${baseurl}/api/chat/${chat_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const chat = response.data.data;
    const users = chat.users;
    setChat(chat);
    setUsers(users);
  }

  async function getChats(token: string) {
    const response = await axios.get(`${baseurl}/api/chat`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    setChats(response.data.data);
  }

  return (
    <div>
      <h1>Socket.IO Chat</h1>
      <input type="text" className='form-control' placeholder="E-Mail" value={email}
        onChange={(e) => setEmail(e.target.value)} />
      <button className='btn my-1' type="submit" onClick={login}>Login</button>
      <button className='btn my-1' type="submit" onClick={connect}>Connect</button>
      <button className='btn my-1' type="submit" onClick={disconnect}>Disconnect</button>

      {chats.length ?
        (<div className='text-start'>
          {chats.map(c => (<div key={c.id} className='form-check'>
            <input type="radio" className='form-check-input' id={c.id}
              checked={c.chat_id == chat?.chat_id} value={c.chat_id} onChange={selectChat} />
            <label className='form-check-label' htmlFor={c.id} style={{ cursor: 'pointer' }}>{c.event.name}</label>
          </div>))}
          <br />
        </div>)
        : null}

      {(user && chat) ? (
        <Fragment>
          <div className='text-start'>
            <span><b>Username :</b></span> <label id="username">{user?.username}</label><br />
            <span><b>Chat Name :</b></span> <label id="chat_name">{chat?.event.name}</label><br />
            <br />
          </div>

          <div>
            {messages.map((message) => {
              const user = users.find(u => u.user_id == message.user_id);
              console.log(`users`, users);

              const username = `${user?.username[0].toUpperCase()}${user?.username.slice(1)}`;

              return (
                <div key={message.id} style={{ display: 'flex', justifyContent: message.fromSelf ? 'end' : 'start' }}>
                  {message.fromSelf ? '' : username + ' :'}{message.text}
                </div>
              )
            })}
          </div>

          <form action="">
            <input type="text" className='form-control' name="message" placeholder="Enter Message" onInput={typing} value={message}
              onChange={(e) => setMessage(e.target.value)} />
            <button className='btn' type="submit" onClick={sendMessage}>Send Message</button>
          </form>
        </Fragment>
      ) : null}
      <ToastContainer autoClose={1000} transition={Bounce} />
    </div>
  )
}

export default App;
