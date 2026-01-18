
import React, { useState, useRef } from 'react';
import { SentenceData, PronunciationFeedback } from '../types';
import { Volume2, Bookmark, Mic, MicOff, RefreshCw, Star, Info, MessageSquare, ArrowRight } from 'lucide-react';
import { checkPronunciation } from '../services/geminiService';

interface SentenceCardProps {
  data: SentenceData;
  isSaved: boolean;
  onToggleSave: () => void;
}

export const SentenceCard: React.FC<SentenceCardProps> = ({ data, isSaved, onToggleSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const playAudio = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data.sentence);
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
            const result = await checkPronunciation(data.sentence, base64Audio, 'audio/webm');
            setFeedback(result);
          } catch (err) { console.error(err); } finally { setIsChecking(false); }
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setFeedback(null);
      setTimeout(() => { if (recorder.state === 'recording') stopRecording(); }, 5000);
    } catch (err) { alert("Cần quyền Micro."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-750 p-6 border-b border-gray-700">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
             <h2 className="text-2xl font-bold text-white leading-tight mb-2">{data.sentence}</h2>
             <p className="text-lg text-emerald-400 font-medium">{data.meaning_vi}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onToggleSave} className={`p-3 rounded-xl transition-all ${isSaved ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}><Bookmark size={20} className={isSaved ? "fill-current" : ""} /></button>
            <button onClick={playAudio} className="p-3 bg-gray-700 hover:bg-emerald-600 text-white rounded-xl"><Volume2 size={20} /></button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isChecking}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${isRecording ? 'bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {isChecking ? <RefreshCw className="animate-spin" size={18} /> : isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            {isRecording ? "Đang nghe..." : "Luyện nói câu này"}
          </button>
        </div>
      </div>

      {(feedback || isChecking) && (
        <div className="p-6 bg-gray-900/50 border-b border-gray-700">
          {isChecking ? (
            <div className="flex items-center gap-3 text-blue-400"><RefreshCw className="animate-spin" size={18} /><span className="text-xs font-bold uppercase tracking-wider">Đang phân tích...</span></div>
          ) : (
            <div className="flex gap-4 items-start">
               <div className="bg-gray-800 p-3 rounded-xl border border-gray-700 text-center min-w-[60px]">
                  <div className={`text-xl font-black ${feedback!.score > 80 ? 'text-emerald-500' : 'text-yellow-500'}`}>{feedback!.score}</div>
                  <div className="text-[8px] text-gray-500 uppercase font-bold">Điểm</div>
               </div>
               <div className="flex-1">
                  <p className="text-white text-sm font-bold mb-1">Tôi nghe thấy: <span className="text-emerald-400 italic">"{feedback!.detected_speech}"</span></p>
                  <p className="text-xs text-gray-400 leading-relaxed">{feedback!.feedback_vi}</p>
               </div>
            </div>
          )}
        </div>
      )}

      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-white font-bold mb-2"><Info size={16} className="text-blue-400" /> Cấu trúc ngữ pháp:</div>
          <div className="text-gray-300 text-sm bg-gray-900/50 p-4 rounded-xl border border-gray-700 leading-relaxed">{data.grammar_breakdown}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Ngữ cảnh</div>
            <div className="text-xs text-gray-300 font-medium">{data.usage_context}</div>
          </div>
          <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
            <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Độ tự nhiên</div>
            <div className="text-lg font-black text-emerald-500">{data.naturalness_score}%</div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-white font-bold mb-3"><MessageSquare size={16} className="text-purple-400" /> Các cách nói tương tự:</div>
          <div className="space-y-2">
            {data.similar_sentences.map((s, i) => (
              <div key={i} className="group/item flex items-center justify-between p-3 rounded-lg hover:bg-gray-750 transition-colors border border-transparent hover:border-gray-700">
                <div>
                  <div className="text-sm font-bold text-white mb-0.5">{s.en}</div>
                  <div className="text-xs text-gray-500">{s.vi}</div>
                </div>
                <ArrowRight size={14} className="text-gray-700 group-hover/item:text-emerald-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
