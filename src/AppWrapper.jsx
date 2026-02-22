/**
 * AppWrapper.jsx — Point d'entrée unifié
 * Licence MIT — Collectif du 2 Juillet (C2J) / MGEC Montauban
 *
 * INSTALLATION :
 * Dans main.jsx, remplacer :
 *   import App from './App'
 * par :
 *   import App from './AppWrapper'
 *
 * DASHBOARD ADMIN :
 * Accessible via  https://votre-domaine.vercel.app/#admin
 * Mot de passe configurable via VITE_ADMIN_PASSWORD dans Vercel env vars.
 */

import React, { useState, useEffect } from 'react';
import { Building, Users, ChevronRight, Clock } from 'lucide-react';
import MontaubanMultivers from './App';
import ConseilMode from './ConseilMode';

// AdminDashboard chargé en lazy pour éviter le double client Supabase au démarrage
const AdminDashboard = React.lazy(() => import('./AdminDashboard'));

const useAdminRoute = () => {
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin');
  useEffect(() => {
    const handler = () => setIsAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return isAdmin;
};

const ModeSelection = ({ onSelectMode }) => (
  <div className="min-h-screen bg-black flex items-center justify-center p-4">
    <div className="max-w-md w-full space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'system-ui' }}>
          MONTAUBAN
        </h1>
        <p className="text-xl font-light text-amber-400/80 tracking-widest uppercase">Multivers</p>
      </div>
      <div className="text-white/50 text-sm leading-relaxed space-y-2 text-center py-2">
        <p>Une ville. Deux réalités. Une seule question :</p>
        <p className="text-amber-400/70">qui décide des règles ?</p>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => onSelectMode('conseil')}
          className="w-full text-left p-5 bg-amber-400/5 border border-amber-400/30 hover:bg-amber-400/10 hover:border-amber-400/50 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-400/10 rounded-sm">
                <Building size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Mode Conseil</p>
                <p className="text-amber-400/50 text-xs uppercase tracking-widest font-mono">Recommandé en premier</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-white/20 group-hover:text-amber-400 transition-colors mt-1" />
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            Vous êtes maire. Six délibérations. Vos décisions configurent le monde dans lequel vivront les personnages.
          </p>
          <div className="flex items-center gap-2 mt-3 text-white/20 text-xs">
            <Clock size={12} /><span>~15 minutes</span>
          </div>
        </button>

        <button
          onClick={() => onSelectMode('multivers')}
          className="w-full text-left p-5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/10 rounded-sm">
                <Users size={18} className="text-white/60" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Mode Multivers</p>
                <p className="text-white/30 text-xs uppercase tracking-widest font-mono">Jouer un personnage</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-white/20 group-hover:text-white/60 transition-colors mt-1" />
          </div>
          <p className="text-white/50 text-sm leading-relaxed">
            Incarnez Mamadou, Inès, Clément ou un autre habitant. Survivez une semaine dans Montauban.
          </p>
          <div className="flex items-center gap-2 mt-3 text-white/20 text-xs">
            <Clock size={12} /><span>~10 minutes</span>
          </div>
        </button>
      </div>
      <p className="text-center text-white/20 text-xs leading-relaxed">
        Jouer le Conseil avant le Multivers révèle comment vos décisions d'élu
        façonnent le quotidien de chaque habitant.
      </p>
    </div>
  </div>
);

const AppWrapper = () => {
  const isAdmin = useAdminRoute();
  const [mode, setMode] = useState('selection');
  const [conseilData, setConseilData] = useState(null);

  if (isAdmin) return (
    <React.Suspense fallback={null}>
      <AdminDashboard />
    </React.Suspense>
  );

  if (mode === 'selection') return <ModeSelection onSelectMode={setMode} />;

  if (mode === 'conseil') {
    return (
      <ConseilMode
        onRetour={() => setMode('selection')}
        onTerminer={(data) => { setConseilData(data); setMode('multivers'); }}
      />
    );
  }

  if (mode === 'multivers') {
    return (
      <MontaubanMultivers
        conseilData={conseilData}
        onRetour={() => setMode('selection')}
      />
    );
  }

  return null;
};

export default AppWrapper;
