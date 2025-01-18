import React, { useEffect, useRef, useState } from 'react';
import * as bodyPix from '@tensorflow-models/body-pix';
import '@tensorflow/tfjs';

export default function BackgroundReplacement() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const animationFrameId = useRef(null);
  const net = useRef(null);
  const lastFrameTime = useRef(0);
  const fps = 30; // Target FPS
  const frameInterval = 1000 / fps;

  useEffect(() => {
    // Load the BodyPix model
    async function loadModel() {
      try {
        net.current = await bodyPix.load({
          architecture: 'MobileNetV1',  // Faster architecture
          outputStride: 16,            // Balance of speed and accuracy
          multiplier: 0.5,             // Reduced for speed
          quantBytes: 2                // Reduced for speed
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load BodyPix model:', error);
      }
    }

    // Load default background image
    const defaultImg = new Image();
    defaultImg.onload = () => {
      setBackgroundImage(defaultImg);
    };
    defaultImg.src = '/room1.png';

    loadModel();

    // Clean up
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setupCamera();
    }
  }, [isLoading]);

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user',
          frameRate: { ideal: fps }
        },
        audio: false
      });

      videoRef.current.srcObject = stream;
      videoRef.current.play();

      // Start processing frames once video is playing
      videoRef.current.addEventListener('playing', () => {
        processFrame();
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const processFrame = async () => {
    const now = performance.now();
    const elapsed = now - lastFrameTime.current;

    if (elapsed < frameInterval) {
      animationFrameId.current = requestAnimationFrame(processFrame);
      return;
    }

    if (!net.current || !videoRef.current || !canvasRef.current || !backgroundImage) return;

    try {
      const segmentation = await net.current.segmentPerson(videoRef.current, {
        flipHorizontal: true,
        internalResolution: 'medium',    // Reduced for speed
        segmentationThreshold: 0.5,      // Keep this for leg detection
        maxDetections: 1,
        scoreThreshold: 0.2,
        nmsRadius: 20
      });

      const ctx = canvasRef.current.getContext('2d', { 
        alpha: false,                    // Optimization for non-transparent canvas
        willReadFrequently: true         // Optimization for frequent pixel manipulation
      });
      
      const { width, height } = canvasRef.current;

      // Draw background
      ctx.drawImage(backgroundImage, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixel = imageData.data;

      // Draw video frame
      ctx.drawImage(videoRef.current, 0, 0);
      const frameData = ctx.getImageData(0, 0, width, height);

      // Simplified pixel manipulation for better performance
      const personMask = segmentation.data;
      const dataLength = personMask.length * 4;
      
      for (let i = 0; i < dataLength; i += 4) {
        const maskIndex = i / 4;
        if (personMask[maskIndex]) {
          pixel[i] = frameData.data[i];
          pixel[i + 1] = frameData.data[i + 1];
          pixel[i + 2] = frameData.data[i + 2];
          pixel[i + 3] = frameData.data[i + 3];
        }
      }

      ctx.putImageData(imageData, 0, 0);
      lastFrameTime.current = now;
      
    } catch (error) {
      console.error('Error processing frame:', error);
    }

    animationFrameId.current = requestAnimationFrame(processFrame);
  };

  const handleBackgroundUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Real-Time Background Replacement</h1>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading BodyPix model...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="absolute hidden"
                width="640"
                height="480"
              />
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                width="640"
                height="480"
              />
            </div>
            
            <div className="mt-4">
              <label className="block mb-2">
                Upload Background Image:
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="mt-1 block w-full"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}