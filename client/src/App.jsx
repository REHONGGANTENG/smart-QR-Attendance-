import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UserScanner from './components/UserScanner';
import AdminDashboard from './components/AdminDashboard';
import ProjectorMode from './components/ProjectorMode';
import AdminAuthModal from './components/AdminAuthModal';
import FirebaseGuideBanner from './components/FirebaseGuideBanner';
import { 
  getSessions, playSuccessSound, subscribeSessions, 
  subscribeAttendances, isFirebaseConfigured 
} from './api';

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
  const [sseConnected, setSseConnected] = useState(true);
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

  // Real-time subscription for Sessions
  useEffect(() => {
    const unsub = subscribeSessions((sessions) => {
      setAllSessions(sessions);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Real-time subscription for Attendances (Firestore onSnapshot)
  useEffect(() => {
    const unsub = subscribeAttendances(
      (attendances) => {
        setSseConnected(true);
      },
      (newAttendee) => {
        setLatestAttendee(newAttendee);
        if (activeTab === 'admin' || projectorSession) {
          playSuccessSound();
        }
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
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

      {/* Firebase Status & Setup Guide Banner */}
      <FirebaseGuideBanner />

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
        Smart QR Attendance System • Powered by Google Firebase Cloud Firestore
      </footer>
    </div>
  );
}
