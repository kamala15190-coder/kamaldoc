import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';

import Splash from './pages/Splash';
import Home from './pages/Home';
import Search from './pages/Search';
import Folder from './pages/Folder';
import Detail from './pages/Detail';
import TasksExtract from './pages/TasksExtract';
import Translate from './pages/Translate';
import Reply from './pages/Reply';
import Befund from './pages/Befund';
import Rechtshilfe from './pages/Rechtshilfe';
import Phishing from './pages/Phishing';
import Doka from './pages/Doka';
import Tasks from './pages/Tasks';
import Scan from './pages/Scan';
import Profile from './pages/Profile';
import Connectors from './pages/Connectors';

import BottomNav from './components/BottomNav';
import DeviceFrame from './components/DeviceFrame';
import { ToastProvider } from './components/Toast';

const HIDE_NAV_ON = ['/splash', '/scan', '/doka'];
const FULLSCREEN_TOOLS = [
  '/tasks-extract',
  '/translate',
  '/reply',
  '/befund',
  '/rechtshilfe',
  '/phishing',
];

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [splashDone, setSplashDone] = useState(false);

  // First load: send to splash
  useEffect(() => {
    if (!splashDone && location.pathname === '/') {
      navigate('/splash', { replace: true });
    }
  }, []); // eslint-disable-line

  const hideNav =
    HIDE_NAV_ON.some((p) => location.pathname.startsWith(p)) ||
    FULLSCREEN_TOOLS.some((p) => location.pathname.startsWith(p));

  return (
    <DeviceFrame>
      <ToastProvider>
        <div id="app" className="app">
          <Routes>
            <Route path="/splash" element={<Splash onDone={() => { setSplashDone(true); navigate('/home'); }} />} />
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/folder" element={<Folder />} />
            <Route path="/detail/:id?" element={<Detail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks-extract/:id?" element={<TasksExtract />} />
            <Route path="/translate/:id?" element={<Translate />} />
            <Route path="/reply/:id?" element={<Reply />} />
            <Route path="/befund/:id?" element={<Befund />} />
            <Route path="/rechtshilfe/:id?" element={<Rechtshilfe />} />
            <Route path="/phishing" element={<Phishing />} />
            <Route path="/doka" element={<Doka />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/connectors" element={<Connectors />} />
          </Routes>

          {!hideNav && <BottomNav />}
        </div>
      </ToastProvider>
    </DeviceFrame>
  );
}
