import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Search, AlertCircle, Check } from 'lucide-react';
import { VDOSKyLogo } from './VDOSKyLogo';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySearch: (query: string) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onApplySearch
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'hi-IN' | 'bn-BD' | 'en-US'>('hi-IN');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setErrorMsg(null);
      return;
    }

    startListening();

    return () => {
      stopListening();
    };
  }, [isOpen, selectedLang]);

  const startListening = () => {
    setErrorMsg(null);
    setTranscript('');

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setErrorMsg('Voice recognition is not supported in this browser. Please type your search.');
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.lang = selectedLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        const current = event.results[0][0].transcript;
        setTranscript(current);

        if (event.results[0].isFinal) {
          setIsListening(false);
          setTimeout(() => {
            if (current.trim()) {
              onApplySearch(current.trim());
              onClose();
            }
          }, 600);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg('Microphone access was denied. Please allow microphone permission in your browser or phone settings.');
        } else if (event.error === 'no-speech') {
          setErrorMsg('No speech detected. Please tap the mic and speak clearly.');
        } else {
          setErrorMsg(`Voice search error (${event.error}). Please try speaking again.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start recognition:', err);
      setIsListening(false);
      setErrorMsg('Could not initialize microphone. Please check app permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#111723] border border-red-500/30 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-4">
          <VDOSKyLogo size={28} />
          <span className="text-sm font-black text-white tracking-wide">VDOSKy Voice Search</span>
        </div>

        {/* Language selector chips */}
        <div className="flex items-center gap-1.5 mb-6 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setSelectedLang('hi-IN')}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
              selectedLang === 'hi-IN'
                ? 'bg-red-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            हिंदी (Hindi)
          </button>
          <button
            onClick={() => setSelectedLang('bn-BD')}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
              selectedLang === 'bn-BD'
                ? 'bg-red-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            বাংলা (Bengali)
          </button>
          <button
            onClick={() => setSelectedLang('en-US')}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
              selectedLang === 'en-US'
                ? 'bg-red-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            English
          </button>
        </div>

        {/* Pulsing Mic Circle */}
        <div className="relative my-4 flex items-center justify-center">
          {isListening && (
            <>
              <div className="absolute w-32 h-32 rounded-full bg-red-500/20 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full border-2 border-red-500/40 animate-pulse" />
            </>
          )}

          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer z-10 ${
              isListening
                ? 'bg-red-600 text-white shadow-red-600/50 hover:bg-red-500'
                : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-700'
            }`}
          >
            {isListening ? (
              <Mic className="w-9 h-9 animate-pulse" />
            ) : (
              <MicOff className="w-9 h-9 text-gray-400" />
            )}
          </button>
        </div>

        {/* Listening Text */}
        <div className="mt-2 min-h-[50px] flex flex-col items-center justify-center">
          {isListening ? (
            <p className="text-red-400 font-bold text-sm animate-pulse flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>Listening... Speak movie title now</span>
            </p>
          ) : (
            <p className="text-gray-400 text-xs">
              Tap the microphone to speak
            </p>
          )}

          {transcript ? (
            <p className="text-white font-black text-lg mt-2 bg-gray-900/90 px-4 py-2 rounded-xl border border-gray-700 max-w-full truncate">
              "{transcript}"
            </p>
          ) : null}

          {errorMsg && (
            <div className="mt-3 flex items-center gap-1.5 text-amber-400 text-xs bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-xl max-w-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Quick Search Suggestions */}
        <div className="mt-6 w-full pt-4 border-t border-gray-800/80">
          <p className="text-[11px] text-gray-400 mb-2 font-semibold">Or tap a quick search:</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {['Aamdani Atthanni', 'Chup Chup Ke', 'Bahadur', 'Govinda', 'Classic', 'Hindi Dubbed'].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  onApplySearch(chip);
                  onClose();
                }}
                className="text-xs bg-gray-800 hover:bg-red-950 hover:border-red-500 border border-gray-700 text-gray-300 hover:text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
