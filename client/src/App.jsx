import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import UserScanner from './components/UserScanner';
import AdminDashboard from './components/AdminDashboard';
import ProjectorMode from './components/ProjectorMode';
import AdminAuthModal from './components/AdminAuthModal';
import { getSessions, playSuccessSound } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'admin'
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => {
    return sessionStorage.getItem('admin_authed') === 'true';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Projector state
  const [projectorSession, setProjectorSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);

  // Real-time events
  const [sseConnected, setSseConnected] = useState(false);
  const [latestAttendee, setLatestAttendee] = useState(null);

  // URL Query Params handling (e.g. ?code=ATT101 or ?tab=admin)
  const [initialCode, setInitialCode] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('session');
    if (codeParam) {
      setInitialCode(codeParam);
      setActiveTab('user');
    }
    const tabParam = params.get('tab');
    if (tabParam === 'admin') {
      handleTabChange('admin');
    }
  }, []);

  // Fetch initial sessions for projector fallback
  useEffect(() => {
    getSessions()
      .then(sessions => {
        setAllSessions(sessions);
      })
      .catch(err => console.error(err));
  }, []);

  // Connect to SSE (Server-Sent Events) for real-time live attendance
  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          setSseConnected(true);
        };

        eventSource.addEventListener('NEW_ATTENDANCE', (e) => {
          try {
            const data = JSON.parse(e.data);
            setLatestAttendee(data);
            // If in admin mode, play soft notification sound
            if (activeTab === 'admin' || projectorSession) {
              playSuccessSound();
            }
          } catch (err) {
            console.error('Error parsing SSE NEW_ATTENDANCE:', err);
          }
        });

        eventSource.onerror = () => {
          setSseConnected(false);
          eventSource.close();
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        setSseConnected(false);
      }
    };

    // Defer slightly so browser stops document loading indicator immediately
    const initTimer = setTimeout(connectSSE, 200);

    return () => {
      clearTimeout(initTimer);
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [activeTab, projectorSession]);

  const handleTabChange = (tab) => {
    if (tab === 'admin' && !isAdminAuthed) {
      setShowAuthModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthed(true);
    setShowAuthModal(false);
    setActiveTab('admin');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_authed');
    setIsAdminAuthed(false);
    setActiveTab('user');
  };

  const handleOpenProjector = (sessionToProject) => {
    if (sessionToProject) {
      setProjectorSession(sessionToProject);
    } else if (allSessions.length > 0) {
      setProjectorSession(allSessions[0]);
    } else {
      alert('Belum ada sesi absensi yang dibuat. Buat sesi terlebih dahulu di tab Admin.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isAdminAuthed={isAdminAuthed}
        onAdminLogout={handleAdminLogout}
        onOpenProjector={() => handleOpenProjector(allSessions[0])}
        sseConnected={sseConnected}
      />

      {/* Main Body */}
      <main className="flex-1">
        {activeTab === 'user' && (
          <UserScanner initialCode={initialCode} />
        )}

        {activeTab === 'admin' && isAdminAuthed && (
          <AdminDashboard
            onOpenProjector={(session) => setProjectorSession(session)}
            latestAttendee={latestAttendee}
          />
        )}
      </main>

      {/* Fullscreen Projector / Presentation Mode */}
      {projectorSession && (
        <ProjectorMode
          session={projectorSession}
          onClose={() => setProjectorSession(null)}
          latestAttendee={latestAttendee}
        />
      )}

      {/* Admin PIN Authentication Modal */}
      <AdminAuthModal
        isOpen={showAuthModal}
        onSuccess={handleAdminAuthSuccess}
        onCancel={() => setShowAuthModal(false)}
      />

      {/* Simple Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Smart QR Attendance System
      </footer>
    </div>
  );
}
