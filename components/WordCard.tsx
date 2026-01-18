
import React, { useState, useRef, useEffect } from 'react';
import { WordData, PronunciationFeedback } from '../types';
import { Volume2, Bookmark, Mic, MicOff, RefreshCw, Star, AlertTriangle, Book } from 'lucide-react';
import { checkPronunciation } from '../services/geminiService';

interface WordCardProps {
  data: WordData;
  isSaved: boolean;
  onToggleSave: () => void;
}

export const WordCard: React.FC<WordCardProps> = ({ data, isSaved, onToggleSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const playAudio = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsChecking(true);
          try {
            const result = await checkPronunciation(data.word, base64Audio, 'audio/webm');
            setFeedback(result);
          } catch (err) {
            console.error(err);
          } finally {
            setIsChecking(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setFeedback(null);

      // Auto stop after 3 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording();
        }
      }, 3000);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Cần quyền truy cập Micro để sử dụng tính năng này.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Local Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'v') playAudio();
      if (key === 'b') onToggleSave();
      if (key === 'r') {
        if (isRecording) stopRecording();
        else startRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data.word, isSaved, isRecording]);

  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative group">
      {/* Header */}
      <div className="bg-gray-750 p-6 border-b border-gray-700 flex justify-between items-start">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-4xl font-bold text-white tracking-tight">{data.word}</h1>
            <div className="text-xs font-mono text-yellow-200 bg-gray-950 px-2 py-0.5 rounded border border-gray-700">/{data.ipa}/</div>
          </div>
          <p className="text-xl text-emerald-400 font-bold mb-2">{data.meaning_vi}</p>
          <div className="flex items-start gap-2 bg-gray-900/40 p-2.5 rounded-lg border border-gray-700/50">
             <Book size={14} className="text-gray-500 mt-1 shrink-0" />
             <p className="text-sm text-gray-300 italic font-medium leading-tight">"{data.definition_en}"</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={onToggleSave}
                className={`p-3 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 relative group/btn ${
                    isSaved 
                    ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' 
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                }`}
                title="Lưu từ [B]"
            >
                <Bookmark size={24} className={isSaved ? "fill-current" : ""} />
                <span className="absolute -bottom-1 -right-1 text-[8px] bg-gray-950 px-1 rounded border border-gray-800 opacity-0 group-hover/btn:opacity-100 transition-opacity">B</span>
            </button>
            <button 
                onClick={playAudio}
                className="p-3 bg-gray-700 hover:bg-emerald-600 text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 relative group/btn"
                aria-label="Play pronunciation [V]"
            >
                <Volume2 size={24} />
                <span className="absolute -bottom-1 -right-1 text-[8px] bg-gray-950 px-1 rounded border border-gray-800 opacity-0 group-hover/btn:opacity-100 transition-opacity">V</span>
            </button>
            <button 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isChecking}
                className={`p-3 rounded-xl transition-all relative group/btn ${
                    isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : isChecking 
                      ? 'bg-gray-700 text-gray-500' 
                      : 'bg-gray-700 text-blue-400 hover:bg-blue-600 hover:text-white'
                }`}
                title="Kiểm tra phát âm [R]"
            >
                {isChecking ? <RefreshCw size={24} className="animate-spin" /> : isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                {isRecording && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                <span className="absolute -bottom-1 -right-1 text-[8px] bg-gray-950 px-1 rounded border border-gray-800 opacity-0 group-hover/btn:opacity-100 transition-opacity">R</span>
            </button>
        </div>
      </div>

      {/* Pronunciation Feedback Overlay */}
      {(feedback || isChecking) && (
        <div className="px-6 py-4 bg-gray-900/80 border-b border-gray-700 animate-in slide-in-from-top duration-300">
          {isChecking ? (
            <div className="flex items-center gap-3 text-blue-400">
               <RefreshCw className="animate-spin" size={20} />
               <span className="text-sm font-bold uppercase tracking-widest">Đang phân tích giọng nói...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
               <div className="relative shrink-0">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-700" />
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" 
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 - (175.9 * feedback!.score) / 100}
                      className={`${feedback!.score > 80 ? 'text-emerald-500' : feedback!.score > 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">
                    {feedback!.score}
                  </div>
               </div>
               <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {feedback!.score > 80 ? <Star className="text-yellow-400 fill-current" size={16} /> : <AlertTriangle className="text-orange-400" size={16} />}
                    <span className="font-bold text-white">Tôi nghe thấy: <span className="text-emerald-400 italic">"{feedback!.detected_speech}"</span></span>
                  </div>
                  <p className="text-sm text-gray-400">{feedback!.feedback_vi}</p>
               </div>
               <button onClick={() => setFeedback(null)} className="text-xs text-gray-500 hover:text-white underline underline-offset-4">Đóng</button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6 space-y-5 text-gray-200 text-base leading-relaxed font-sans">
        
        {/* Syllables & Spelling Tip */}
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-bold text-white min-w-[100px] whitespace-nowrap">Tách từ:</span>
            <span className="font-medium tracking-wide">{data.syllables}</span>
          </div>
          {data.spelling_tip && (
            <div className="pl-[108px] text-amber-300 italic flex items-start gap-1">
              {data.spelling_tip}
            </div>
          )}
        </div>

        {/* Part of Speech */}
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-white min-w-[100px]">Loại từ:</span>
          <span className="italic text-blue-300">{data.part_of_speech}</span>
        </div>

        {/* Examples */}
        <div className="space-y-4">
          <div>
            <div className="font-bold text-white mb-1 flex items-center gap-2">
              Ví dụ (B1):
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase font-black">Intermediate</span>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-lg border-l-4 border-emerald-500">
              <p className="text-lg text-gray-100 mb-1">{data.example_en}</p>
              <p className="text-gray-400">→ {data.example_vi}</p>
            </div>
          </div>

          <div>
            <div className="font-bold text-white mb-1 flex items-center gap-2">
              Ví dụ (B2):
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase font-black">Upper-Intermediate</span>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-lg border-l-4 border-blue-500">
              <p className="text-lg text-gray-100 mb-1">{data.example_b2_en}</p>
              <p className="text-gray-400">→ {data.example_b2_vi}</p>
            </div>
          </div>
        </div>

        {/* Root / Mnemonic */}
        <div>
          <div className="font-bold text-white mb-1">Từ gốc + mẹo nhớ:</div>
          <div className="text-gray-300 bg-gray-700/30 p-2 rounded">
            {data.root_word_mnemonic}
          </div>
        </div>

        {/* Synonyms / Antonyms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <span className="font-bold text-white shrink-0">Đồng nghĩa:</span>
            <span className="text-gray-300">{data.synonyms.join(', ')}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-white shrink-0">Trái nghĩa:</span>
            <span className="text-gray-300">{data.antonyms.join(', ') || 'N/A'}</span>
          </div>
        </div>

        {/* Word Family */}
        <div className="flex items-start gap-2">
          <span className="font-bold text-white min-w-[100px]">Họ từ:</span>
          <span className="text-gray-300">{data.word_family.join(', ')}</span>
        </div>

        {/* Collocation */}
        <div className="flex items-start gap-2">
          <span className="font-bold text-white min-w-[100px]">Collocation:</span>
          <span className="text-purple-300">{data.collocations.join(' / ')}</span>
        </div>

      </div>
    </div>
  );
};
