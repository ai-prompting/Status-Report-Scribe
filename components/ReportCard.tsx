import React, { useState, useRef, useEffect } from 'react';
import { CardStatus, ReportItem, TargetLanguage } from '../types';
import { generateReportFromAudio } from '../services/geminiService';
import { fileToData } from '../utils/audioUtils';
import { 
  MicrophoneIcon, 
  StopIcon, 
  ArrowPathIcon, 
  ClipboardDocumentCheckIcon, 
  TrashIcon,
  DocumentTextIcon,
  PaperClipIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ReportCardProps {
  item: ReportItem;
  onUpdate: (id: string, updates: Partial<ReportItem>) => void;
  onDelete: (id: string) => void;
  language: TargetLanguage;
}

export const ReportCard: React.FC<ReportCardProps> = ({ item, onUpdate, onDelete, language }) => {
  const [timer, setTimer] = useState(0);
  const [showContext, setShowContext] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); 
        handleProcessing(blob);
      };

      mediaRecorder.start();
      onUpdate(item.id, { status: CardStatus.RECORDING });
      
      setTimer(0);
      timerIntervalRef.current = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Mic access denied", err);
      onUpdate(item.id, { status: CardStatus.ERROR, error: "Mic access denied" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      onUpdate(item.id, { status: CardStatus.PROCESSING, durationSeconds: timer });
    }
  };

  const handleProcessing = async (blob: Blob) => {
    try {
      const text = await generateReportFromAudio(
        blob, 
        blob.type, 
        language,
        item.contextText,
        item.contextFile
      );
      onUpdate(item.id, { status: CardStatus.COMPLETED, text });
    } catch (error: any) {
      onUpdate(item.id, { status: CardStatus.ERROR, error: error.message });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const { base64, mimeType } = await fileToData(file);
        onUpdate(item.id, {
          contextFile: {
            name: file.name,
            mimeType,
            data: base64
          }
        });
      } catch (err) {
        console.error("File read error", err);
      }
    }
  };

  const removeFile = () => {
    onUpdate(item.id, { contextFile: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(item.text);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasContext = !!(item.contextText?.trim() || item.contextFile);

  return (
    <div className={`
      relative flex flex-col p-4 rounded-xl border shadow-lg transition-all duration-300
      ${item.status === CardStatus.RECORDING ? 'border-red-500 bg-red-900/10' : 'border-gray-700 bg-gray-800'}
      ${item.status === CardStatus.COMPLETED ? 'border-green-600/50' : ''}
    `}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3 gap-2">
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          <input
            type="text"
            value={item.speakerName}
            onChange={(e) => onUpdate(item.id, { speakerName: e.target.value })}
            className="bg-transparent text-gray-100 font-semibold text-base border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none transition-all w-full min-w-[100px] placeholder-gray-600"
            placeholder="Speaker Name"
          />
          
          {item.status === CardStatus.RECORDING && (
            <span className="flex-none flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold animate-pulse whitespace-nowrap">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              {formatTime(timer)}
            </span>
          )}
          {item.status === CardStatus.PROCESSING && (
            <span className="flex-none text-xs text-blue-400 font-medium flex items-center gap-1 whitespace-nowrap">
              <ArrowPathIcon className="w-3 h-3 animate-spin" /> Transcribing
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowContext(!showContext)}
            className={`p-1.5 rounded transition-colors ${showContext || hasContext ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 hover:text-gray-300'}`}
            title="Add Context (Existing Info)"
          >
            <DocumentTextIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
            title="Delete Card"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Context Section (Collapsible) */}
      {(showContext || hasContext) && (
        <div className={`mb-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 text-sm ${!showContext ? 'hidden' : 'block'}`}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Existing Context</span>
            <button onClick={() => setShowContext(false)} className="text-gray-500 hover:text-gray-300">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          <textarea
            value={item.contextText || ''}
            onChange={(e) => onUpdate(item.id, { contextText: e.target.value })}
            className="w-full bg-gray-800 text-gray-300 text-xs p-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none resize-none mb-2"
            placeholder="Paste existing info here to avoid duplicates..."
            rows={3}
          />

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".txt,.md,.pdf,image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              <PaperClipIcon className="w-3.5 h-3.5" />
              {item.contextFile ? 'Change File' : 'Attach File'}
            </button>
            
            {item.contextFile && (
              <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
                <span className="truncate max-w-[100px]">{item.contextFile.name}</span>
                <button onClick={removeFile} className="hover:text-blue-300"><XMarkIcon className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-[120px] flex flex-col justify-center">
        {item.status === CardStatus.IDLE && (
          <div className="text-center">
            <button
              onClick={startRecording}
              className="group relative inline-flex items-center justify-center p-4 rounded-full bg-gray-700 hover:bg-red-600 transition-all duration-200 shadow-lg"
            >
              <MicrophoneIcon className="w-8 h-8 text-white" />
              <span className="absolute -bottom-8 text-xs text-gray-400 group-hover:text-white">Start Recording</span>
            </button>
          </div>
        )}

        {item.status === CardStatus.RECORDING && (
          <div className="text-center">
             <button
              onClick={stopRecording}
              className="group relative inline-flex items-center justify-center p-6 rounded-full bg-red-600 hover:bg-red-700 transition-all shadow-lg ring-4 ring-red-900"
            >
              <StopIcon className="w-10 h-10 text-white" />
              <span className="absolute -bottom-8 text-xs font-bold text-red-400">STOP</span>
            </button>
          </div>
        )}

        {item.status === CardStatus.PROCESSING && (
          <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-70">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400 animate-pulse">Processing Audio...</p>
          </div>
        )}

        {item.status === CardStatus.ERROR && (
          <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded border border-red-900/50">
            <p className="font-bold">Error:</p>
            {item.error}
            <button 
              onClick={() => onUpdate(item.id, { status: CardStatus.IDLE, error: undefined })}
              className="mt-2 text-xs underline hover:text-red-300"
            >
              Reset
            </button>
          </div>
        )}

        {item.status === CardStatus.COMPLETED && (
          <div className="flex flex-col h-full">
            <textarea
              value={item.text}
              onChange={(e) => onUpdate(item.id, { text: e.target.value })}
              className="flex-1 w-full bg-gray-900/50 text-gray-200 text-sm p-3 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none font-sans leading-relaxed"
              spellCheck={false}
              placeholder="Waiting for audio transcript..."
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded shadow transition-colors"
              >
                <ClipboardDocumentCheckIcon className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};