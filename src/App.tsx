import { useEffect, useState, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  ChevronRight, 
  ChevronLeft, 
  Lock, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { CATEGORIES, CANDIDATES, Vote } from './constants';

// Error handling helper
const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase Error during ${operation}:`, error);
  // We don't throw here to avoid crashing the UI, but we log it
};

// Fallback voter ID for when auth fails
const getFallbackVoterId = () => {
  let id = localStorage.getItem('oscar_voter_id');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oscar_voter_id', id);
  }
  return id;
};

export default function App() {
  const [voterId] = useState(getFallbackVoterId());
  const [isReady, setIsReady] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({
    first: '',
    second: '',
    third: ''
  });
  const [votedCategories, setVotedCategories] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'voting' | 'presentation' | 'finished'>('voting');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // Results state
  const [allVotes, setAllVotes] = useState<Vote[]>([]);
  const [presentationIndex, setPresentationIndex] = useState(0);

  // Initial data fetch and realtime setup
  useEffect(() => {
    const fetchData = async () => {
      // Fetch all votes
      const { data: votes, error } = await supabase
        .from('votes')
        .select('*');
      
      if (error) {
        handleSupabaseError(error, 'FETCH_VOTES');
      } else if (votes) {
        setAllVotes(votes as Vote[]);
        
        // Update voted categories for current user
        const userVoted = new Set<string>();
        votes.forEach((v: any) => {
          if (v.voterId === voterId) {
            userVoted.add(v.categoryId);
          }
        });
        setVotedCategories(userVoted);
      }
      
      setIsReady(true);
    };

    fetchData();

    // Set up realtime subscription
    const subscription = supabase
      .channel('public:votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) => {
        const newVote = payload.new as Vote;
        setAllVotes(prev => [...prev, newVote]);
        if (newVote.voterId === voterId) {
          setVotedCategories(prev => new Set(prev).add(newVote.categoryId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [voterId]);

  const currentCategory = CATEGORIES[currentCategoryIndex];

  const handleVote = async () => {
    if (!selections.first || !selections.second || !selections.third) return;

    const voteData = {
      categoryId: currentCategory.id,
      firstPlace: selections.first,
      secondPlace: selections.second,
      thirdPlace: selections.third,
      voterId: voterId,
      timestamp: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('votes')
        .insert([voteData]);

      if (error) throw error;

      setSelections({ first: '', second: '', third: '' });
      
      if (currentCategoryIndex < CATEGORIES.length - 1) {
        setCurrentCategoryIndex(prev => prev + 1);
      } else {
        setView('finished');
      }
    } catch (error) {
      handleSupabaseError(error, 'INSERT_VOTE');
    }
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.toLowerCase() === 'cacca') {
      setShowPasswordModal(false);
      setView('presentation');
      setPresentationIndex(0);
      setPassword('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const aggregatedResults = useMemo(() => {
    const results: Record<string, Record<string, number>> = {};
    
    CATEGORIES.forEach(cat => {
      results[cat.id] = {};
      CANDIDATES.forEach(cand => {
        results[cat.id][cand] = 0;
      });
    });

    allVotes.forEach(vote => {
      const catResults = results[vote.categoryId] as any;
      if (catResults) {
        const first = vote.firstPlace;
        const second = vote.secondPlace;
        const third = vote.thirdPlace;
        
        catResults[first] = (catResults[first] || 0) + 4;
        catResults[second] = (catResults[second] || 0) + 2;
        catResults[third] = (catResults[third] || 0) + 1;
      }
    });

    return results;
  }, [allVotes]);

  const getPodium = (categoryId: string) => {
    const scores = aggregatedResults[categoryId] || {};
    return Object.entries(scores)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([name, score]) => ({ name, score }));
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
          <p className="text-lg font-medium animate-pulse">Caricamento Oscar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase italic hidden sm:block">Oscar Friends 2026</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Presentazione
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 pt-12">
        <AnimatePresence mode="wait">
          {view === 'voting' && (
            <motion.div
              key="voting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-amber-500 font-mono text-sm font-bold uppercase tracking-widest">
                    Categoria {currentCategoryIndex + 1} di {CATEGORIES.length}
                  </span>
                  {votedCategories.has(currentCategory.id) && (
                    <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Già votato
                    </span>
                  )}
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  {currentCategory.label}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'first', label: '1° Posto', pts: 4, color: 'from-amber-400 to-amber-600' },
                  { id: 'second', label: '2° Posto', pts: 2, color: 'from-slate-300 to-slate-500' },
                  { id: 'third', label: '3° Posto', pts: 1, color: 'from-orange-400 to-orange-700' }
                ].map((pos) => (
                  <div key={pos.id} className="space-y-3">
                    <label className="block text-sm font-bold uppercase tracking-wider text-white/50">
                      {pos.label} <span className="text-white/30">({pos.pts} pts)</span>
                    </label>
                    <div className="relative group">
                      <select
                        value={selections[pos.id as keyof typeof selections]}
                        onChange={(e) => setSelections(prev => ({ ...prev, [pos.id]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all hover:bg-white/10 cursor-pointer"
                      >
                        <option value="" className="bg-neutral-900">Seleziona...</option>
                        {CANDIDATES.map(cand => (
                          <option 
                            key={cand} 
                            value={cand} 
                            className="bg-neutral-900"
                            disabled={Object.values(selections).includes(cand) && selections[pos.id as keyof typeof selections] !== cand}
                          >
                            {cand}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 group-hover:text-white/60 transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleVote}
                  disabled={!selections.first || !selections.second || !selections.third || votedCategories.has(currentCategory.id)}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black py-4 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tighter text-lg"
                >
                  {votedCategories.has(currentCategory.id) ? 'Voto Registrato' : 'Conferma Voto'}
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentCategoryIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentCategoryIndex === 0}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setCurrentCategoryIndex(prev => Math.min(CATEGORIES.length - 1, prev + 1))}
                    disabled={currentCategoryIndex === CATEGORIES.length - 1}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-20"
            >
              <div className="inline-block p-6 bg-emerald-500/20 rounded-full mb-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              </div>
              <h2 className="text-5xl font-black tracking-tight">Votazione Completata!</h2>
              <p className="text-xl text-white/60 max-w-md mx-auto">
                Hai votato in tutte le categorie. Ora non resta che aspettare la proclamazione dei vincitori.
              </p>
              <button
                onClick={() => setView('voting')}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors font-bold uppercase tracking-widest text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Rivedi i tuoi voti
              </button>
            </motion.div>
          )}

          {view === 'presentation' && (
            <motion.div
              key="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-amber-500 font-mono text-sm font-bold uppercase tracking-widest">
                    Risultati: {presentationIndex + 1} di {CATEGORIES.length}
                  </span>
                  <h2 className="text-4xl font-black tracking-tight">
                    {CATEGORIES[presentationIndex].label}
                  </h2>
                </div>
                <button
                  onClick={() => setView('voting')}
                  className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
                {/* Podium Visualization */}
                <div className="flex justify-center items-end h-80 gap-4">
                  {(() => {
                    const podium = getPodium(CATEGORIES[presentationIndex].id);
                    const order = [1, 0, 2]; // 2nd, 1st, 3rd
                    
                    return order.map((posIdx, i) => {
                      const item = podium[posIdx];
                      if (!item) return <div key={i} className="flex-1" />;

                      const heights = ['h-48', 'h-64', 'h-32'];
                      const colors = [
                        'bg-gradient-to-t from-slate-700 to-slate-400',
                        'bg-gradient-to-t from-amber-700 to-amber-400',
                        'bg-gradient-to-t from-orange-800 to-orange-500'
                      ];
                      const labels = ['2°', '1°', '3°'];

                      return (
                        <motion.div
                          key={item.name}
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          transition={{ delay: i * 0.2, type: 'spring' }}
                          className="flex flex-col items-center flex-1"
                        >
                          <span className="mb-2 font-black text-xl truncate w-full text-center">{item.name}</span>
                          <div className={`w-full ${heights[posIdx]} ${colors[posIdx]} rounded-t-2xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-white/10 opacity-20 transform -skew-x-12 translate-x-1/2" />
                            <span className="text-4xl font-black text-black/50">{labels[posIdx]}</span>
                            <span className="text-sm font-bold text-black/70 mt-1">{item.score} pts</span>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </div>

                {/* Score List */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Classifica Completa</h3>
                  <div className="space-y-2">
                    {getPodium(CATEGORIES[presentationIndex].id).map((result, idx) => (
                      <motion.div
                        key={result.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1 }}
                        className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5"
                      >
                        <span className="font-bold text-lg">
                          <span className="text-white/30 mr-3">{idx + 1}.</span>
                          {result.name}
                        </span>
                        <span className="font-mono text-amber-500 font-bold">{result.score} pts</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-12">
                <button
                  onClick={() => setPresentationIndex(prev => Math.max(0, prev - 1))}
                  disabled={presentationIndex === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors font-bold"
                >
                  <ChevronLeft className="w-5 h-5" /> Precedente
                </button>
                <button
                  onClick={() => setPresentationIndex(prev => Math.min(CATEGORIES.length - 1, prev + 1))}
                  disabled={presentationIndex === CATEGORIES.length - 1}
                  className="flex items-center gap-2 px-8 py-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-colors font-black uppercase tracking-widest"
                >
                  Successivo <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-amber-500/10 rounded-full">
                  <Lock className="w-10 h-10 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Accesso Riservato</h3>
                  <p className="text-white/50">Inserisci la password per visualizzare i risultati finali.</p>
                </div>
                
                <form onSubmit={handlePasswordSubmit} className="w-full space-y-4">
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password..."
                      autoFocus
                      className={`w-full bg-white/5 border ${passwordError ? 'border-red-500' : 'border-white/10'} rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-center text-xl tracking-widest`}
                    />
                    {passwordError && (
                      <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center gap-1 text-red-500 text-xs font-bold uppercase">
                        <AlertCircle className="w-3 h-3" /> Password Errata
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-neutral-200 transition-colors uppercase tracking-widest"
                  >
                    Sblocca Risultati
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="p-12 text-center text-white/20 text-xs uppercase tracking-[0.2em] font-medium">
        &copy; 2026 Oscar Friends &bull; All Rights Reserved
      </footer>
    </div>
  );
}
