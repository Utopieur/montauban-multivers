/**
 * Montauban Multivers — Dashboard Analytics
 * Licence MIT — Collectif du 2 Juillet (C2J) / MGEC Montauban
 *
 * Accessible via /admin dans votre app React.
 * Nécessite la table analytics_events dans Supabase (voir SQL ci-dessous).
 *
 * SQL à exécuter dans Supabase :
 * ─────────────────────────────
 * CREATE TABLE analytics_events (
 *   id BIGSERIAL PRIMARY KEY,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   player_id TEXT NOT NULL,
 *   event TEXT NOT NULL,
 *   data JSONB DEFAULT '{}'
 * );
 * CREATE INDEX analytics_event_idx ON analytics_events(event);
 * CREATE INDEX analytics_player_idx ON analytics_events(player_id);
 * CREATE INDEX analytics_created_idx ON analytics_events(created_at DESC);
 * ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Public insert" ON analytics_events FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Admin read" ON analytics_events FOR SELECT USING (true);
 * ─────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Protéger avec un mot de passe simple côté client
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'mgec2024';

const CHARACTER_NAMES = {
  mamadou: 'Mamadou (Livreur)',
  ines: 'Inès (Aide-soignante)',
  clement: 'Clément (Cadre Airbus)',
  francoise: 'Françoise (Retraitée)',
  philippe: 'Philippe (Maraîcher)',
  leo: 'Léo (Lycéen)',
  nadia: 'Nadia (Mère seule)',
};

const DOMAIN_LABELS = {
  transports: 'Transports',
  travail: 'Travail',
  sante: 'Santé',
  education: 'Éducation',
  alimentation: 'Alimentation',
  logement: 'Logement',
  securite: 'Sécurité',
  climat: 'Climat',
  liens: 'Liens sociaux',
  citoyennete: 'Citoyenneté',
  droits: 'Droits',
};

const Stat = ({ label, value, sub }) => (
  <div className="bg-white/5 border border-white/10 p-5 space-y-1">
    <p className="text-white/40 text-xs uppercase tracking-widest font-mono">{label}</p>
    <p className="text-3xl font-black text-white font-mono">{value}</p>
    {sub && <p className="text-white/30 text-xs">{sub}</p>}
  </div>
);

const Bar = ({ label, value, max, color = 'bg-amber-400' }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-white/60">{label}</span>
      <span className="text-white/40 font-mono">{value}</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-500`}
        style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
      />
    </div>
  </div>
);

export default function AdminDashboard() {
  const [auth, setAuth] = useState(false);
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(7); // jours

  const handleLogin = () => {
    if (pwd === ADMIN_PASSWORD) setAuth(true);
    else setError('Mot de passe incorrect');
  };

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setEvents(data || []);
        setLoading(false);
      });
  }, [auth, period]);

  // Calculs dérivés
  const players = new Set(events.map(e => e.player_id)).size;
  const starts = events.filter(e => e.event === 'game_started').length;
  const completions = events.filter(e => e.event === 'game_completed').length;
  const resumes = events.filter(e => e.event === 'game_resumed').length;
  const completionRate = starts > 0 ? Math.round((completions / starts) * 100) : 0;

  const charCounts = events
    .filter(e => e.event === 'character_selected')
    .reduce((acc, e) => {
      const id = e.data?.characterId;
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
  const maxChar = Math.max(...Object.values(charCounts), 1);

  const domainCounts = events
    .filter(e => e.event === 'choice_made')
    .reduce((acc, e) => {
      const d = e.data?.domain;
      if (d) acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
  const maxDomain = Math.max(...Object.values(domainCounts), 1);

  const worldCounts = events
    .filter(e => e.event === 'choice_made')
    .reduce((acc, e) => {
      const w = e.data?.world;
      if (w) acc[w] = (acc[w] || 0) + 1;
      return acc;
    }, {});

  // Choix les plus fréquents
  const choiceCounts = events
    .filter(e => e.event === 'choice_made')
    .reduce((acc, e) => {
      const key = `${e.data?.sceneId}::${e.data?.choiceId}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const topChoices = Object.entries(choiceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Scènes d'abandon (game_over par scène)
  const gameoverByScene = events
    .filter(e => e.event === 'game_over')
    .reduce((acc, e) => {
      const s = e.data?.sceneIndex ?? 'fin';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

  if (!auth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-xs space-y-4">
          <h1 className="text-white font-bold text-center uppercase tracking-widest">Admin</h1>
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Mot de passe"
            className="w-full bg-white/10 border border-white/20 text-white p-3 outline-none focus:border-amber-400/50"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-white text-black font-bold py-3 uppercase tracking-widest text-sm hover:bg-amber-400 transition-all"
          >
            Entrer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 text-white">
      <div className="max-w-4xl mx-auto space-y-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest">Analytics</h1>
            <p className="text-white/40 text-sm font-mono">Montauban Multivers — MGEC</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1 text-xs font-mono border transition-all ${
                  period === d
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'
                }`}
              >
                {d}j
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-white/30 text-sm font-mono animate-pulse">Chargement...</p>
        )}

        {/* Stats globales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Joueurs uniques" value={players} />
          <Stat label="Parties lancées" value={starts} />
          <Stat label="Parties terminées" value={completions} sub={`${completionRate}% de complétion`} />
          <Stat label="Reprises" value={resumes} sub="parties continuées" />
        </div>

        {/* Personnages choisis */}
        <div className="bg-white/5 border border-white/10 p-6 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-mono">Personnages joués</p>
          <div className="space-y-3">
            {Object.entries(CHARACTER_NAMES).map(([id, name]) => (
              <Bar
                key={id}
                label={name}
                value={charCounts[id] || 0}
                max={maxChar}
                color="bg-amber-400"
              />
            ))}
          </div>
        </div>

        {/* Monde A vs Monde B */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 p-5 space-y-2">
            <p className="text-white/40 text-xs uppercase tracking-widest font-mono">Ville A (droite)</p>
            <p className="text-2xl font-black font-mono text-red-400">{worldCounts['A'] || 0}</p>
            <p className="text-white/30 text-xs">choix effectués</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 space-y-2">
            <p className="text-white/40 text-xs uppercase tracking-widest font-mono">Ville B (gauche)</p>
            <p className="text-2xl font-black font-mono text-emerald-400">{worldCounts['B'] || 0}</p>
            <p className="text-white/30 text-xs">choix effectués</p>
          </div>
        </div>

        {/* Domaines */}
        <div className="bg-white/5 border border-white/10 p-6 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-mono">Domaines (choix effectués)</p>
          <div className="space-y-3">
            {Object.entries(domainCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([domain, count]) => (
                <Bar
                  key={domain}
                  label={DOMAIN_LABELS[domain] || domain}
                  value={count}
                  max={maxDomain}
                  color="bg-blue-400"
                />
              ))}
          </div>
        </div>

        {/* Abandons par scène */}
        {Object.keys(gameoverByScene).length > 0 && (
          <div className="bg-white/5 border border-white/10 p-6 space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-widest font-mono">Game over par scène</p>
            <div className="space-y-3">
              {Object.entries(gameoverByScene)
                .sort((a, b) => Number(a[0]) - Number(b[0]))
                .map(([scene, count]) => (
                  <Bar
                    key={scene}
                    label={`Scène ${Number(scene) + 1}`}
                    value={count}
                    max={Math.max(...Object.values(gameoverByScene))}
                    color="bg-red-400"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Top choix */}
        <div className="bg-white/5 border border-white/10 p-6 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-mono">Choix les plus fréquents</p>
          <div className="space-y-2">
            {topChoices.map(([key, count]) => {
              const [sceneId, choiceId] = key.split('::');
              return (
                <div key={key} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-white/50 font-mono text-xs truncate max-w-xs">
                    {sceneId} → {choiceId}
                  </span>
                  <span className="text-amber-400 font-mono text-xs ml-4 shrink-0">{count}×</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Événements récents */}
        <div className="bg-white/5 border border-white/10 p-6 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-widest font-mono">Événements récents</p>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {events.slice(0, 50).map(e => (
              <div key={e.id} className="flex items-center gap-3 text-xs py-1 border-b border-white/5">
                <span className="text-white/20 font-mono w-28 shrink-0">
                  {new Date(e.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`font-mono shrink-0 ${
                  e.event === 'game_completed' ? 'text-emerald-400' :
                  e.event === 'game_over' ? 'text-red-400' :
                  e.event === 'character_selected' ? 'text-amber-400' :
                  'text-white/40'
                }`}>{e.event}</span>
                <span className="text-white/30 truncate">
                  {e.data?.characterId || e.data?.choiceId || ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs font-mono pt-4">
          MGEC Montauban — Collectif du 2 Juillet (C2J)
        </p>
      </div>
    </div>
  );
}
