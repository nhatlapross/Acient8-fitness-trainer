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

  useEffect(() => {
    // Load the BodyPix model
    async function loadModel() {
      try {
        net.current = await bodyPix.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load BodyPix model:', error);
      }
    }

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
          height: 480
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
    if (!net.current || !videoRef.current || !canvasRef.current) return;

    // Perform segmentation
    const segmentation = await net.current.segmentPerson(videoRef.current);

    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;

    // Draw the background image or color
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#00ff00'; // Default green background
      ctx.fillRect(0, 0, width, height);
    }

    // Draw the person
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixel = imageData.data;
    const personMask = segmentation.data;

    // Get video frame data
    ctx.drawImage(videoRef.current, 0, 0);
    const frameData = ctx.getImageData(0, 0, width, height);

    // Combine person with background
    for (let i = 0; i < personMask.length; i++) {
      const n = i * 4;
      if (personMask[i]) {
        pixel[n] = frameData.data[n];     // Red
        pixel[n + 1] = frameData.data[n + 1]; // Green
        pixel[n + 2] = frameData.data[n + 2]; // Blue
        pixel[n + 3] = frameData.data[n + 3]; // Alpha
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Continue processing frames
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
        img.src = '/blackGround.png';
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen p-8 ">
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