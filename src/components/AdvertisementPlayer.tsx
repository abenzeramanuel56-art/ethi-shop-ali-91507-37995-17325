import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  media_url: string;
  media_type: string;
  quiz_difficulty: string;
  display_duration_seconds: number;
  time_gap_minutes: number;
  trigger_type: string; // on_open | on_route_change | on_interval | on_specific_page
  trigger_path: string | null;
}

const SHOWN_KEY = 'ad_shown_session_v2';

function getShownSet(): Set<string> {
  try { return new Set(JSON.parse(sessionStorage.getItem(SHOWN_KEY) || '[]')); } catch { return new Set(); }
}
function markShown(id: string) {
  const s = getShownSet(); s.add(id);
  sessionStorage.setItem(SHOWN_KEY, JSON.stringify(Array.from(s)));
}

export function AdvertisementPlayer() {
  const location = useLocation();
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState({ a: 0, b: 0, operator: '+', answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const lastShownAtRef = useRef<Record<string, number>>({});
  const previousPathRef = useRef<string | null>(null);

  const generateQuiz = useCallback((difficulty: string) => {
    let a: number, b: number, operator: string, answer: number;
    switch (difficulty) {
      case 'simple': a = Math.floor(Math.random() * 10) + 1; b = Math.floor(Math.random() * 10) + 1; operator = '+'; answer = a + b; break;
      case 'medium': a = Math.floor(Math.random() * 50) + 10; b = Math.floor(Math.random() * 50) + 10; operator = Math.random() > 0.5 ? '+' : '-'; answer = operator === '+' ? a + b : a - b; break;
      case 'hard': a = Math.floor(Math.random() * 30) + 10; b = Math.floor(Math.random() * 10) + 2; operator = '×'; answer = a * b; break;
      default: return null;
    }
    return { a, b, operator, answer };
  }, []);

  // Fetch advertisements + subscribe
  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await (supabase as any)
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (data) setAdvertisements(data as Advertisement[]);
    };
    fetchAds();
    const channel = supabase
      .channel('advertisements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, fetchAds)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Try to play an ad based on triggers
  const tryPlay = useCallback((reason: 'on_open' | 'on_route_change' | 'on_interval' | 'on_specific_page', path?: string) => {
    if (showAd || advertisements.length === 0) return;
    const shown = getShownSet();
    const now = Date.now();

    // Find matching ad
    const candidate = advertisements.find((ad) => {
      if (ad.trigger_type !== reason) return false;
      if (reason === 'on_open' && shown.has(ad.id)) return false;
      if (reason === 'on_specific_page' && ad.trigger_path && path && ad.trigger_path !== path) return false;
      const last = lastShownAtRef.current[ad.id] || 0;
      const minutesSince = (now - last) / 1000 / 60;
      if (last && minutesSince < (ad.time_gap_minutes || 30)) return false;
      return true;
    });

    if (candidate) {
      setCurrentAd(candidate);
      setTimeRemaining(candidate.display_duration_seconds);
      setShowAd(true);
      setShowQuiz(false);
      setUserAnswer('');
      lastShownAtRef.current[candidate.id] = now;
      markShown(candidate.id);
    }
  }, [advertisements, showAd]);

  // On open (only once per session per ad)
  useEffect(() => {
    if (advertisements.length === 0) return;
    const t = setTimeout(() => tryPlay('on_open'), 2000);
    return () => clearTimeout(t);
  }, [advertisements, tryPlay]);

  // On route change
  useEffect(() => {
    if (previousPathRef.current === null) {
      previousPathRef.current = location.pathname;
      // Specific page on first land
      tryPlay('on_specific_page', location.pathname);
      return;
    }
    if (previousPathRef.current !== location.pathname) {
      previousPathRef.current = location.pathname;
      tryPlay('on_route_change');
      tryPlay('on_specific_page', location.pathname);
    }
  }, [location.pathname, tryPlay]);

  // Interval
  useEffect(() => {
    const interval = setInterval(() => tryPlay('on_interval'), 30 * 1000);
    return () => clearInterval(interval);
  }, [tryPlay]);

  // Countdown
  useEffect(() => {
    if (!showAd || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (currentAd && currentAd.quiz_difficulty !== 'none') {
            const quiz = generateQuiz(currentAd.quiz_difficulty);
            if (quiz) { setQuizQuestion(quiz); setShowQuiz(true); } else { setShowAd(false); }
          } else { setShowAd(false); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showAd, timeRemaining, currentAd, generateQuiz]);

  const handleQuizSubmit = () => {
    if (parseInt(userAnswer) === quizQuestion.answer) {
      setShowAd(false); setShowQuiz(false); setUserAnswer('');
    } else { setUserAnswer(''); }
  };

  if (!showAd || !currentAd) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        {!showQuiz && timeRemaining > 0 && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
            {timeRemaining}s
          </div>
        )}
        {!showQuiz && (
          <div className="rounded-lg overflow-hidden">
            {currentAd.media_type === 'video' ? (
              <video src={currentAd.media_url} autoPlay muted loop playsInline className="w-full max-h-[80vh] object-contain" />
            ) : (
              <img src={currentAd.media_url} alt={currentAd.title} className="w-full max-h-[80vh] object-contain" />
            )}
          </div>
        )}
        {showQuiz && (
          <div className="bg-background rounded-lg p-8 text-center max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Solve to close</h3>
            <p className="text-3xl font-bold mb-6">{quizQuestion.a} {quizQuestion.operator} {quizQuestion.b} = ?</p>
            <div className="flex gap-2">
              <Input type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Your answer" className="text-center text-lg" onKeyPress={(e) => e.key === 'Enter' && handleQuizSubmit()} autoFocus />
              <Button onClick={handleQuizSubmit}><X className="h-4 w-4 mr-2" />Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
