import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { Camera, Check, X, Eye, RotateCcw, Loader2 } from 'lucide-react';
import * as faceapi from 'face-api.js';

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [lastDescriptor, setLastDescriptor] = useState<Float32Array | null>(null);
  const [blinkState, setBlinkState] = useState<'open' | 'closed' | 'detected'>('open');
  const detectionIntervalRef = useRef<number | null>(null);

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

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        setModelsLoaded(true);
      } catch (error) {
        console.error('Error loading face-api models:', error);
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (modelsLoaded) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded]);

  useEffect(() => {
    setInstruction(getInstructionText(currentChallenge));
  }, [currentChallenge, getInstructionText]);

  // Start face detection loop
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current || currentChallenge === 'complete') return;

    const detectFaces = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setFaceDetected(true);
          setLastDescriptor(detection.descriptor);

          // Get face landmarks for challenge validation
          const landmarks = detection.landmarks;
          const nose = landmarks.getNose();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          // Calculate head pose based on nose position relative to face box
          const faceBox = detection.detection.box;
          const noseX = nose[3].x;
          const faceCenterX = faceBox.x + faceBox.width / 2;
          const headTurn = (noseX - faceCenterX) / (faceBox.width / 2);

          // Validate current challenge
          if (!isCapturing) {
            validateChallenge(headTurn, leftEye, rightEye);
          }
        } else {
          setFaceDetected(false);
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    };

    detectionIntervalRef.current = window.setInterval(detectFaces, 200);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded, currentChallenge, isCapturing]);

  const validateChallenge = (headTurn: number, leftEye: faceapi.Point[], rightEye: faceapi.Point[]) => {
    switch (currentChallenge) {
      case 'center':
        // Head should be relatively straight
        if (Math.abs(headTurn) < 0.15) {
          passChallenge();
        }
        break;
      case 'left':
        // Head should be turned left (positive headTurn in mirrored video)
        if (headTurn > 0.2) {
          passChallenge();
        }
        break;
      case 'right':
        // Head should be turned right
        if (headTurn < -0.2) {
          passChallenge();
        }
        break;
      case 'blink':
        // Detect blink by measuring eye aspect ratio
        const leftEAR = calculateEyeAspectRatio(leftEye);
        const rightEAR = calculateEyeAspectRatio(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;

        if (avgEAR < 0.2) {
          if (blinkState === 'open') {
            setBlinkState('closed');
          }
        } else if (blinkState === 'closed') {
          setBlinkState('detected');
          passChallenge();
        }
        break;
    }
  };

  const calculateEyeAspectRatio = (eye: faceapi.Point[]): number => {
    // Simple EAR calculation
    const verticalDist1 = Math.abs(eye[1].y - eye[5].y);
    const verticalDist2 = Math.abs(eye[2].y - eye[4].y);
    const horizontalDist = Math.abs(eye[0].x - eye[3].x);
    
    return (verticalDist1 + verticalDist2) / (2 * horizontalDist);
  };

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

  const passChallenge = () => {
    if (!challengesPassed.includes(currentChallenge)) {
      setIsCapturing(true);
      
      setTimeout(() => {
        const newPassed = [...challengesPassed, currentChallenge];
        setChallengesPassed(newPassed);
        
        const currentIndex = challenges.indexOf(currentChallenge);
        if (currentIndex < challenges.length - 1) {
          setCurrentChallenge(challenges[currentIndex + 1]);
          setBlinkState('open');
        } else {
          setCurrentChallenge('complete');
          capturePhoto();
        }
        setIsCapturing(false);
      }, 500);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && lastDescriptor) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            // Convert Float32Array to regular array for storage
            const descriptorArray = Array.from(lastDescriptor);
            onComplete(blob, descriptorArray);
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

  if (loadingModels) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">{t('face.loadingModels')}</p>
            <p className="text-sm text-muted-foreground text-center">
              {t('face.loadingModelsDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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

            {/* Capturing overlay */}
            {isCapturing && (
              <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                <Check className="h-16 w-16 text-white" />
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

          {/* Status message */}
          <div className="text-center">
            {!faceDetected && currentChallenge !== 'complete' && (
              <p className="text-sm text-yellow-600">{t('face.positionFace')}</p>
            )}
            {faceDetected && currentChallenge !== 'complete' && (
              <p className="text-sm text-green-600">{t('face.faceDetected')}</p>
            )}
          </div>

          {currentChallenge !== 'complete' ? (
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </Button>
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