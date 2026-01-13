import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CardStatus, ReportItem, TargetLanguage } from './types';
import { ReportCard } from './components/ReportCard';
import { PlusIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [items, setItems] = useState<ReportItem[]>([]);
  const [language, setLanguage] = useState<TargetLanguage>('en');
  // Ref to scroll to new items
  const bottomRef = useRef<HTMLDivElement>(null);

  const addNewCard = () => {
    setItems(prev => {
      const newItem: ReportItem = {
        id: uuidv4(),
        speakerName: `Speaker ${prev.length + 1}`,
        status: CardStatus.IDLE,
        text: '',
        timestamp: Date.now(),
        durationSeconds: 0
      };
      return [...prev, newItem];
    });
  };

  const updateItem = (id: string, updates: Partial<ReportItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Auto-scroll when a new item is added
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items.length]);

  // Initial card
  useEffect(() => {
    if (items.length === 0) {
      addNewCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Status Report Scribe
            </h1>
            <p className="text-xs text-gray-500">Audio to {language === 'en' ? 'English' : 'German'} Bullet Points</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Switch */}
            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('de')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${language === 'de' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
              >
                DE
              </button>
            </div>

            <button
              onClick={addNewCard}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg transition-all active:scale-95 text-sm"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="hidden sm:inline">New Speaker</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600">
              <p>No active reports.</p>
              <button onClick={addNewCard} className="mt-4 text-blue-400 hover:underline">Start a new one</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => (
                <ReportCard
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  language={language}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </main>
      
      {/* Footer Instructions */}
      <footer className="flex-none p-2 text-center text-xs text-gray-600 border-t border-gray-800">
        Use separate cards for each speaker. Recording continues in background while you process others.
      </footer>
    </div>
  );
};

export default App;