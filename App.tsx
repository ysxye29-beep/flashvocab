
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Zap, BookOpen, AlertCircle, LayoutGrid, RotateCcw, Keyboard as KeyboardIcon, Calendar, ArrowRight, CheckCircle2, MessageSquare, Quote, X as ClearIcon, ZapOff, Timer } from 'lucide-react';
import { WordData, SentenceData } from './types';
import { lookupWord, lookupSentence } from './services/geminiService';
import { WordCard } from './components/WordCard';
import { SentenceCard } from './components/SentenceCard';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { FlashcardPage } from './components/FlashcardPage';
import { StudySession } from './components/StudySession';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'word' | 'sentence'>('word');
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [sentenceData, setSentenceData] = useState<SentenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number | null>(null);
  
  const [currentView, setCurrentView] = useState<'search' | 'flashcards' | 'study'>('search');
  
  const [savedWords, setSavedWords] = useState<WordData[]>(() => {
    try {
      const saved = localStorage.getItem('flashcards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [savedSentences, setSavedSentences] = useState<SentenceData[]>(() => {
    try {
      const saved = localStorage.getItem('saved_sentences');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [studyQueue, setStudyQueue] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // Fix: Use ReturnType<typeof setTimeout> to avoid NodeJS namespace errors in browser environments
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = Date.now();
  const dueWordsCount = useMemo(() => savedWords.filter(w => !w.next_review || w.next_review <= now).length, [savedWords, now]);
  const dueSentencesCount = useMemo(() => savedSentences.filter(s => !s.next_review || s.next_review <= now).length, [savedSentences, now]);

  useEffect(() => {
    if (currentView === 'search') {
      inputRef.current?.focus();
    }
  }, [currentView, searchMode]);

  // Real-time search effect
  useEffect(() => {
    if (currentView !== 'search' || query.trim().length < 2) {
      if (query.trim().length === 0) {
        setWordData(null);
        setSentenceData(null);
        setLastLoadTime(null);
      }
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms debounce for ultra-fast but stable search

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query, searchMode, currentView]);

  useEffect(() => {
    localStorage.setItem('flashcards', JSON.stringify(savedWords));
  }, [savedWords]);

  useEffect(() => {
    localStorage.setItem('saved_sentences', JSON.stringify(savedSentences));
  }, [savedSentences]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery || loading) return;

    // Don't re-search if it's the same word already displayed
    if (searchMode === 'word' && wordData?.word.toLowerCase() === cleanQuery.toLowerCase()) return;
    if (searchMode === 'sentence' && sentenceData?.sentence.toLowerCase() === cleanQuery.toLowerCase()) return;

    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      if (searchMode === 'word') {
        const result = await lookupWord(cleanQuery);
        setWordData(result);
        setSentenceData(null);
      } else {
        const result = await lookupSentence(cleanQuery);
        setSentenceData(result);
        setWordData(null);
      }
      const endTime = performance.now();
      setLastLoadTime(Math.round(endTime - startTime));
    } catch (err) {
      setError("Không thể thực hiện tra cứu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setWordData(null);
    setSentenceData(null);
    setError(null);
    setLastLoadTime(null);
    inputRef.current?.focus();
  };

  const isCurrentWordSaved = wordData ? savedWords.some(w => w.word.toLowerCase() === wordData.word.toLowerCase()) : false;
  const isCurrentSentenceSaved = sentenceData ? savedSentences.some(s => s.sentence === sentenceData.sentence) : false;

  const handleToggleSaveWord = () => {
    if (!wordData) return;
    if (isCurrentWordSaved) {
      setSavedWords(prev => prev.filter(w => w.word.toLowerCase() !== wordData.word.toLowerCase()));
    } else {
      setSavedWords(prev => [{ ...wordData, srs_level: 0, next_review: Date.now() }, ...prev]);
    }
  };

  const handleToggleSaveSentence = () => {
    if (!sentenceData) return;
    if (isCurrentSentenceSaved) {
      setSavedSentences(prev => prev.filter(s => s.sentence !== sentenceData.sentence));
    } else {
      setSavedSentences(prev => [{ ...sentenceData, srs_level: 0, next_review: Date.now(), date_saved: Date.now() }, ...prev]);
    }
  };

  const handleStartStudy = (type: 'word' | 'sentence' | 'all', mode: 'due' | 'all') => {
      const nowTs = Date.now();
      let queue: any[] = [];
      
      if (type === 'word' || type === 'all') {
        const words = mode === 'due' ? savedWords.filter(w => !w.next_review || w.next_review <= nowTs) : savedWords;
        queue = [...queue, ...words];
      }
      
      if (type === 'sentence' || type === 'all') {
        const sentences = mode === 'due' ? savedSentences.filter(s => !s.next_review || s.next_review <= nowTs) : savedSentences;
        queue = [...queue, ...sentences];
      }

      if (queue.length === 0) return;
      setStudyQueue(queue.sort(() => Math.random() - 0.5));
      setCurrentView('study');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-emerald-500/30">
      <header className="py-4 px-4 border-b border-gray-800 bg-gray-950/80 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('search')}>
            <div className="bg-emerald-500 p-2 rounded-lg text-gray-900 shadow-lg shadow-emerald-500/20"><Zap size={20} strokeWidth={3} /></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent hidden sm:block">FlashVocab</h1>
              <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-black tracking-widest leading-none">
                <Zap size={10} fill="currentColor" /> TURBO MODE
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
             <button onClick={() => setCurrentView('search')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'search' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-400'}`}><Search size={18} /><span className="hidden sm:inline">Tra cứu</span></button>
             <button onClick={() => setCurrentView('flashcards')} className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentView === 'flashcards' || currentView === 'study' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-400'}`}>
                <LayoutGrid size={18} />
                <span className="hidden sm:inline">Kho lưu trữ</span>
                {(dueWordsCount + dueSentencesCount) > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-black flex items-center justify-center text-white">{dueWordsCount + dueSentencesCount}</span>
                  </span>
                )}
             </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow container max-w-6xl mx-auto px-4 py-8 flex flex-col items-center">
        {currentView === 'search' && (
            <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="w-full max-w-2xl mb-8">
                    <div className="flex bg-gray-900 p-1 rounded-2xl border border-gray-800 mb-6 w-fit mx-auto">
                        <button onClick={() => setSearchMode('word')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${searchMode === 'word' ? 'bg-emerald-500 text-gray-950' : 'text-gray-500'}`}><Zap size={14} /> TỪ VỰNG</button>
                        <button onClick={() => setSearchMode('sentence')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${searchMode === 'sentence' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}><MessageSquare size={14} /> MẪU CÂU</button>
                    </div>

                    <form onSubmit={handleSearch} className="relative group">
                        <input
                          ref={inputRef}
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={searchMode === 'word' ? "Nhập từ (Tự động tra sau 0.5s)..." : "Nhập câu (Tự động tra sau 0.5s)..."}
                          className="w-full bg-gray-900/50 text-xl text-white placeholder-gray-600 border-2 border-gray-800 rounded-2xl py-4 pl-14 pr-36 shadow-xl focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={24} />
                        
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {query && (
                            <button 
                              type="button" 
                              onClick={clearSearch} 
                              className="p-2 text-gray-500 hover:text-white transition-colors"
                              title="Xóa nhanh [Esc]"
                            >
                              <ClearIcon size={20} />
                            </button>
                          )}
                          <div className="bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-500/20 text-[10px] font-black text-emerald-500 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                             AUTO-TRA
                          </div>
                        </div>
                    </form>
                    
                    {lastLoadTime && !loading && (
                      <div className="mt-4 flex justify-center">
                        <div className="flex items-center gap-2 bg-gray-900/80 px-3 py-1 rounded-full border border-gray-800 text-[10px] text-gray-400 font-mono animate-in fade-in zoom-in duration-300">
                          <Timer size={12} className="text-emerald-500" />
                          <span>Phản hồi: <span className="text-emerald-400 font-bold">{(lastLoadTime / 1000).toFixed(2)}s</span></span>
                          <span className="text-gray-700">|</span>
                          <span className="text-emerald-500 font-black tracking-widest">REAL-TIME ACTIVE</span>
                        </div>
                      </div>
                    )}
                </div>

                <div className="w-full flex justify-center pb-20">
                    {loading && <LoadingSkeleton />}
                    {error && <div className="bg-red-900/20 border border-red-500/20 text-red-200 p-6 rounded-2xl flex items-center gap-4 max-w-lg"><AlertCircle size={24} className="text-red-500" /> <p>{error}</p></div>}
                    {wordData && !loading && searchMode === 'word' && <WordCard data={wordData} isSaved={isCurrentWordSaved} onToggleSave={handleToggleSaveWord} />}
                    {sentenceData && !loading && searchMode === 'sentence' && <SentenceCard data={sentenceData} isSaved={isCurrentSentenceSaved} onToggleSave={handleToggleSaveSentence} />}
                    {!loading && !wordData && !sentenceData && !error && (
                        <div className="text-center text-gray-700 mt-16 opacity-30 select-none">
                            <Quote size={64} className="mx-auto mb-4" />
                            <h3 className="text-xl font-bold uppercase tracking-[0.3em]">Gõ để tra ngay lập tức</h3>
                        </div>
                    )}
                </div>
            </div>
        )}

        {currentView === 'flashcards' && (
            <div className="w-full space-y-12">
              <FlashcardPage 
                words={savedWords} 
                sentences={savedSentences}
                onSelectWord={(w) => { setWordData(w); setSearchMode('word'); setQuery(w.word); setCurrentView('search'); }} 
                onSelectSentence={(s) => { setSentenceData(s); setSearchMode('sentence'); setQuery(s.sentence); setCurrentView('search'); }}
                onRemoveWord={(s) => setSavedWords(prev => prev.filter(w => w.word !== s))} 
                onRemoveSentence={(s) => setSavedSentences(prev => prev.filter(item => item.sentence !== s))}
                onStartStudy={(type, mode) => handleStartStudy(type, mode)} 
                onBackToSearch={() => setCurrentView('search')} 
              />
            </div>
        )}
      </main>

      {currentView === 'study' && <StudySession words={studyQueue} onComplete={() => setCurrentView('flashcards')} onUpdateWord={(w) => {
          if ('word' in w) {
              setSavedWords(prev => prev.map(old => old.word === w.word ? w as WordData : old));
          } else {
              setSavedSentences(prev => prev.map(old => old.sentence === w.sentence ? w as SentenceData : old));
          }
      }} />}
    </div>
  );
};

export default App;
