
import React, { useState, useMemo } from 'react';
import { WordData, SentenceData } from '../types';
import { Trash2, BookOpen, PlayCircle, LayoutGrid, List, Eye, EyeOff, FileSpreadsheet, FileText, Download, Settings as SettingsIcon, Cloud, RefreshCw, XCircle, Flame, MessageSquare, ChevronRight, CheckCircle2, BookMarked, HelpCircle, Info } from 'lucide-react';

interface FlashcardPageProps {
  words: WordData[];
  sentences: SentenceData[];
  onSelectWord: (word: WordData) => void;
  onSelectSentence: (sentence: SentenceData) => void;
  onRemoveWord: (word: string) => void;
  onRemoveSentence: (sentence: string) => void;
  onStartStudy: (type: 'word' | 'sentence' | 'all', mode: 'due' | 'all') => void;
  onBackToSearch: () => void;
  sheetsUrl: string;
  onUpdateSheetsUrl: (url: string) => void;
}

export const FlashcardPage: React.FC<FlashcardPageProps> = ({
  words, sentences, onSelectWord, onSelectSentence, onRemoveWord, onRemoveSentence, onStartStudy, onBackToSearch, sheetsUrl, onUpdateSheetsUrl
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isTestMode, setIsTestMode] = useState(false);
  const [revealedItems, setRevealedItems] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSheetsConfig, setShowSheetsConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const now = Date.now();
  const dueWords = useMemo(() => words.filter(w => !w.next_review || w.next_review <= now), [words, now]);
  const dueSentences = useMemo(() => sentences.filter(s => !s.next_review || s.next_review <= now), [sentences, now]);
  const totalItemsCount = words.length + sentences.length;

  const srsBuckets = useMemo(() => {
    const buckets = [
      { level: 0, label: '1 ngày', count: 0, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
      { level: 1, label: '3 ngày', count: 0, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10' },
      { level: 2, label: '7 ngày', count: 0, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
      { level: 3, label: '14 ngày', count: 0, color: 'text-pink-400', border: 'border-pink-500/30', bg: 'bg-pink-500/10' },
      { level: 4, label: '30 ngày', count: 0, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
    ];
    [...words, ...sentences].forEach(item => {
      const level = item.srs_level || 0;
      if (level >= 0 && level <= 4) buckets[level].count++;
      else if (level > 4) buckets[4].count++;
    });
    return buckets;
  }, [words, sentences]);

  const syncAllToSheets = async () => {
    if (!sheetsUrl || isSyncing) return;
    setIsSyncing(true);
    try {
      for (const w of words) {
        await fetch(sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ type: 'Word', ...w }) });
      }
      for (const s of sentences) {
        await fetch(sheetsUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ type: 'Sentence', ...s }) });
      }
      alert(`Đã đồng bộ thành công lên Google Sheets!`);
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToExcel = () => {
    let csvContent = "\uFEFFType,English,IPA,Vietnamese\n";
    words.forEach(w => csvContent += `Word,"${w.word}","/${w.ipa}/","${w.meaning_vi}"\n`);
    sentences.forEach(s => csvContent += `Sentence,"${s.sentence}","","${s.meaning_vi}"\n`);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `FlashVocab_Export.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const getStatusInfo = (item: WordData | SentenceData) => {
    const level = item.srs_level || 0;
    if (level >= 4) return { text: "Thành thạo", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: <CheckCircle2 size={12} /> };
    if (level >= 2) return { text: "Đang nhớ", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: <BookMarked size={12} /> };
    return { text: "Mới học", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: <HelpCircle size={12} /> };
  };

  const toggleReveal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newRevealed = new Set(revealedItems);
    if (newRevealed.has(id)) newRevealed.delete(id);
    else newRevealed.add(id);
    setRevealedItems(newRevealed);
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 px-1 pb-10">
      <div className="bg-gray-900 rounded-2xl p-4 sm:p-6 mb-6 border border-gray-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg text-gray-950"><BookOpen size={20} /></div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Kho lưu trữ</h2>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setShowSheetsConfig(!showSheetsConfig)} className="p-2.5 bg-gray-800 rounded-xl border border-gray-700 text-gray-400"><SettingsIcon size={18} /></button>
            <button onClick={() => onStartStudy('all', 'due')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10">
              <PlayCircle size={18} fill="currentColor" /> Ôn {(dueWords.length + dueSentences.length)} mục
            </button>
          </div>
        </div>

        {showSheetsConfig && (
          <div className="mb-6 p-4 bg-gray-950/50 rounded-xl border border-blue-500/30 animate-in slide-in-from-top-2">
            <input 
              type="text" 
              value={sheetsUrl} 
              onChange={(e) => onUpdateSheetsUrl(e.target.value)}
              placeholder="Google Apps Script URL..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-emerald-400 focus:outline-none mb-2"
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 italic">Dán URL để đồng bộ dữ liệu</span>
              <button onClick={() => setShowSheetsConfig(false)} className="px-4 py-1.5 bg-gray-800 text-white text-[10px] font-black uppercase rounded-lg">Đóng</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-5 gap-2">
          {srsBuckets.map((bucket, i) => (
            <button key={i} onClick={() => setFilterLevel(filterLevel === bucket.level ? null : bucket.level)} className={`flex flex-col items-center p-2 rounded-xl border transition-all ${filterLevel === bucket.level ? `${bucket.bg} ${bucket.border}` : 'bg-gray-800/30 border-gray-800/50'}`}>
              <span className={`text-[8px] font-black uppercase mb-1 ${bucket.color}`}>{bucket.level === 4 ? 'Done' : `Lv.${bucket.level}`}</span>
              <span className="text-sm font-black text-white">{bucket.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <button onClick={() => setIsTestMode(!isTestMode)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${isTestMode ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>
          {isTestMode ? <EyeOff size={14} /> : <Eye size={14} />} {isTestMode ? 'Ẩn nghĩa' : 'Kiểm tra'}
        </button>
        <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800 shadow-sm">
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-800 text-emerald-400' : 'text-gray-600'}`}><List size={18} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-800 text-emerald-400' : 'text-gray-600'}`}><LayoutGrid size={18} /></button>
        </div>
      </div>

      <div className="space-y-8">
        {words.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 text-gray-600 uppercase text-[9px] font-black tracking-widest"><BookOpen size={12} /> Từ vựng</div>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "flex flex-col gap-2"}>
              {words.filter(w => filterLevel === null || (filterLevel === 4 ? (w.srs_level || 0) >= 4 : (w.srs_level || 0) === filterLevel)).map((word) => {
                const isMastered = (word.srs_level || 0) >= 4;
                const shouldBlur = isTestMode && !revealedItems.has(word.word);
                return (
                  <div key={word.word} onClick={() => onSelectWord(word)} className={`group relative bg-gray-900/60 hover:bg-gray-800/80 border ${isMastered ? 'border-emerald-500/20' : 'border-gray-800'} p-3 rounded-xl transition-all cursor-pointer`}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-base font-black ${isMastered ? 'text-emerald-400' : 'text-white'}`}>{word.word}</h3>
                      <button onClick={(e) => { e.stopPropagation(); onRemoveWord(word.word); }} className="p-1 text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="relative">
                      {shouldBlur && <div onClick={(e) => toggleReveal(e, word.word)} className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center text-[8px] font-black uppercase text-emerald-500">Xem nghĩa</div>}
                      <p className={`text-xs text-gray-400 truncate ${shouldBlur ? 'blur-md' : ''}`}>{word.meaning_vi}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sentences.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 text-gray-600 uppercase text-[9px] font-black tracking-widest"><MessageSquare size={12} /> Mẫu câu</div>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "flex flex-col gap-2"}>
              {sentences.filter(s => filterLevel === null || (filterLevel === 4 ? (s.srs_level || 0) >= 4 : (s.srs_level || 0) === filterLevel)).map((s) => {
                const isMastered = (s.srs_level || 0) >= 4;
                const shouldBlur = isTestMode && !revealedItems.has(s.sentence);
                return (
                  <div key={s.sentence} onClick={() => onSelectSentence(s)} className={`group relative bg-gray-900/60 hover:bg-gray-800/80 border ${isMastered ? 'border-emerald-500/20' : 'border-gray-800'} p-3 rounded-xl transition-all cursor-pointer`}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-black truncate pr-4 ${isMastered ? 'text-emerald-400' : 'text-white'}`}>{s.sentence}</h3>
                      <button onClick={(e) => { e.stopPropagation(); onRemoveSentence(s.sentence); }} className="p-1 text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="relative">
                      {shouldBlur && <div onClick={(e) => toggleReveal(e, s.sentence)} className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center text-[8px] font-black uppercase text-emerald-500">Xem nghĩa</div>}
                      <p className={`text-[11px] text-gray-400 truncate ${shouldBlur ? 'blur-md' : ''}`}>{s.meaning_vi}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
                      <span className="text-[8px] text-blue-500 font-black uppercase">{s.naturalness_score}% Natural</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (<div key={i} className={`w-1 h-1 rounded-full ${i < (s.srs_level || 0) ? 'bg-blue-500' : 'bg-gray-800'}`}></div>))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
