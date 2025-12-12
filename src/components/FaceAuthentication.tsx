import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Camera, Check, X, Eye, RotateCcw } from 'lucide-react';

interface FaceAuthenticationProps {
  onComplete: (facePhoto: Blob, faceDescriptor: number[]) => void;
  onCancel: () => void;
}

type Challenge = 'center' | 'left' | 'right' | 'blink' | 'complete';

export function FaceAuthentication({ onComplete, onCancel }: FaceAuthenticationProps) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge>('center');
  const [challengesPassed, setChallengesPassed] = useState<Challenge[]>([]);
  const [instruction, setInstruction] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const challenges: Challenge[] = ['center', 'left', 'right', 'blink'];

  const getInstructionText = useCallback((challenge: Challenge) => {
    switch (challenge) {
      case 'center':
        return t('face.lookCenter');
      case 'left':
        return t('face.turnLeft');
      case 'right':
        return t('face.turnRight');
      case 'blink':
        return t('face.blinkEyes');
      case 'complete':
        return t('face.complete');
      default:
        return '';
    }
  }, [t]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    setInstruction(getInstructionText(currentChallenge));
  }, [currentChallenge, getInstructionText]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const simulateFaceDetection = () => {
    // Simulate face detection - in production would use face-api.js
    setFaceDetected(true);
    return true;
  };

  const passChallenge = () => {
    if (!challengesPassed.includes(currentChallenge)) {
      const newPassed = [...challengesPassed, currentChallenge];
      setChallengesPassed(newPassed);
      
      const currentIndex = challenges.indexOf(currentChallenge);
      if (currentIndex < challenges.length - 1) {
        setCurrentChallenge(challenges[currentIndex + 1]);
      } else {
        setCurrentChallenge('complete');
        capturePhoto();
      }
    }
  };

  const handleChallengeClick = () => {
    if (simulateFaceDetection()) {
      setCountdown(3);
      setIsCapturing(true);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsCapturing(false);
            passChallenge();
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            // Generate a simple face descriptor (in production would use face-api.js)
            const fakeDescriptor = Array.from({ length: 128 }, () => Math.random());
            onComplete(blob, fakeDescriptor);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const getChallengeIcon = (challenge: Challenge) => {
    switch (challenge) {
      case 'blink':
        return <Eye className="h-6 w-6" />;
      case 'left':
      case 'right':
        return <RotateCcw className={`h-6 w-6 ${challenge === 'right' ? 'scale-x-[-1]' : ''}`} />;
      default:
        return <Camera className="h-6 w-6" />;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">{t('face.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('face.description')}</p>
          </div>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mb-4">
            {challenges.map((challenge, index) => (
              <div
                key={challenge}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  challengesPassed.includes(challenge)
                    ? 'bg-green-500 text-white'
                    : currentChallenge === challenge
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {challengesPassed.includes(challenge) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
            ))}
          </div>

          {/* Camera view */}
          <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-64 border-4 rounded-full transition-colors ${
                faceDetected ? 'border-green-500' : 'border-white/50'
              }`} />
            </div>

            {/* Countdown overlay */}
            {isCapturing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-6xl font-bold text-white">{countdown}</span>
              </div>
            )}

            {/* Instruction overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-center gap-2 text-white">
                {getChallengeIcon(currentChallenge)}
                <span className="text-lg font-medium">{instruction}</span>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {currentChallenge !== 'complete' ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleChallengeClick}
                disabled={isCapturing}
                className="flex-1"
              >
                {isCapturing ? t('face.hold') : t('face.verify')}
              </Button>
            </div>
          ) : (
            <div className="text-center text-green-600 font-medium">
              <Check className="h-8 w-8 mx-auto mb-2" />
              {t('face.complete')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}