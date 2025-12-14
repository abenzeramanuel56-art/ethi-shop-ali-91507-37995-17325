import { useState, useEffect, useCallback } from 'react';
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
}

export function AdvertisementPlayer() {
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState({ a: 0, b: 0, operator: '+', answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [lastShownTime, setLastShownTime] = useState<number>(0);

  const generateQuiz = useCallback((difficulty: string) => {
    let a: number, b: number, operator: string, answer: number;

    switch (difficulty) {
      case 'simple':
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
        operator = '+';
        answer = a + b;
        break;
      case 'medium':
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * 50) + 10;
        operator = Math.random() > 0.5 ? '+' : '-';
        answer = operator === '+' ? a + b : a - b;
        break;
      case 'hard':
        a = Math.floor(Math.random() * 30) + 10;
        b = Math.floor(Math.random() * 10) + 2;
        operator = '×';
        answer = a * b;
        break;
      default:
        return null;
    }

    return { a, b, operator, answer };
  }, []);

  // Fetch advertisements
  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (data && data.length > 0) {
        setAdvertisements(data);
      }
    };

    fetchAds();

    // Subscribe to changes
    const channel = supabase
      .channel('advertisements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => {
        fetchAds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check if it's time to show an ad
  useEffect(() => {
    if (advertisements.length === 0) return;

    const checkAdTiming = () => {
      const now = Date.now();
      const ad = advertisements[currentAdIndex];
      
      if (!ad) return;

      const timeSinceLastAd = (now - lastShownTime) / 1000 / 60; // in minutes

      if (timeSinceLastAd >= ad.time_gap_minutes || lastShownTime === 0) {
        setCurrentAd(ad);
        setTimeRemaining(ad.display_duration_seconds);
        setShowAd(true);
        setShowQuiz(false);
        setUserAnswer('');
        setLastShownTime(now);

        // Move to next ad for next time
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkAdTiming, 30000);
    
    // Initial check after 10 seconds
    const initialTimeout = setTimeout(checkAdTiming, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [advertisements, currentAdIndex, lastShownTime]);

  // Countdown timer
  useEffect(() => {
    if (!showAd || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up, show quiz if needed
          if (currentAd?.quiz_difficulty !== 'none') {
            const quiz = generateQuiz(currentAd.quiz_difficulty);
            if (quiz) {
              setQuizQuestion(quiz);
              setShowQuiz(true);
            } else {
              setShowAd(false);
            }
          } else {
            setShowAd(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showAd, timeRemaining, currentAd, generateQuiz]);

  const handleQuizSubmit = () => {
    if (parseInt(userAnswer) === quizQuestion.answer) {
      setShowAd(false);
      setShowQuiz(false);
      setUserAnswer('');
    } else {
      setUserAnswer('');
    }
  };

  if (!showAd || !currentAd) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        {/* Timer */}
        {!showQuiz && timeRemaining > 0 && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
            {timeRemaining}s
          </div>
        )}

        {/* Media content */}
        {!showQuiz && (
          <div className="rounded-lg overflow-hidden">
            {currentAd.media_type === 'video' ? (
              <video
                src={currentAd.media_url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full max-h-[80vh] object-contain"
              />
            ) : (
              <img
                src={currentAd.media_url}
                alt={currentAd.title}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        )}

        {/* Quiz overlay */}
        {showQuiz && (
          <div className="bg-background rounded-lg p-8 text-center max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Solve to close</h3>
            <p className="text-3xl font-bold mb-6">
              {quizQuestion.a} {quizQuestion.operator} {quizQuestion.b} = ?
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Your answer"
                className="text-center text-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleQuizSubmit()}
                autoFocus
              />
              <Button onClick={handleQuizSubmit}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}