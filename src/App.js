import React, { useEffect, useState, useRef } from 'react';
import logo from './logo.svg';
import './App.css';
import Script from 'react-inline-script';
//import cv from './opencv-wasm'; 
import cv from './opencv-4.3.0';
import Utils from './utils';
import { createFFmpeg } from '@ffmpeg/ffmpeg';

function App() {
  const ffmpeg = createFFmpeg({
    log: true,
  });
  const [streaming, setStreaming] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const uploadVideo = useRef(0);

  const handleUploadVideo = () => runAnon({
    videoInput: document.getElementById('video'),
    canvasOutput: document.getElementById('canvasOutput'),
    detectFace: document.getElementById('face'),
    detectEye: document.getElementById('eye'),
    uploadVideo: uploadVideo,
    streaming: streaming,
    setStreaming: setStreaming,
    setMediaRecorder: setMediaRecorder,
  });

  const stopRecording = () => {
    if (mediaRecorder !== undefined) {
      mediaRecorder.stop();
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <input type="file" id="file" ref={uploadVideo} onChange={handleUploadVideo} accept="video/*"/>
        <div id="container">
          <canvas id="canvasOutput"></canvas>
        </div>
        <div>
          <input type="checkbox" id="face" name="classifier" value="face" defaultChecked></input>
          <label htmlFor="face">face</label>
          <input type="checkbox" id="eye" name="cascade" value="eye"></input>
          <label htmlFor="eye">eye</label>
        </div>
        <div>
          <video id="video">Your browser does not support the video tag.</video>
        </div>
        <button onClick={stopRecording}>STOP</button>
      </header>
      <Script>
      {`
       var Module = {
     wasmBinaryFile: 'https://huningxin.github.io/opencv.js/build/wasm/opencv_js.wasm',
    preRun: [function() {
      Module.FS_createPreloadedFile('/', 'haarcascade_eye.xml', 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_eye.xml', true, false);
      Module.FS_createPreloadedFile('/', 'haarcascade_frontalface_default.xml', 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml', true, false);
      Module.FS_createPreloadedFile('/', 'haarcascade_profileface.xml', 'haarcascade_profileface.xml', true, false);
    }],
    _main: function() {opencvIsReady();}
  };
  `}
    </Script>
    </div>
  );
}

const runAnon = ({
  videoInput,
  canvasOutput,
  detectFace,
  detectEye,
  uploadVideo,
  streaming,
  setStreaming,
  setMediaRecorder,
}) => {
  videoInput.src = (window.URL || window.webkitURL).createObjectURL(uploadVideo.current.files[0]);
  const mediaRecorder = outputRecorder({
    videoInput: videoInput,
    canvasOutput: canvasOutput,
    audioTrack: outputAudioTrack({
      videoInput: videoInput,
      playback: false,
    }),
  });
  setMediaRecorder(mediaRecorder);
  setStreaming(
    initVideo({
      videoInput: videoInput,
      canvasOutput: canvasOutput,
      detectFace: detectFace,
      detectEye: detectEye,
      mediaRecorder: mediaRecorder,
      streaming: streaming,
    })
  );
};

const outputAudioTrack = ({
  videoInput,
  playback,
}) => {
  const audioContext = new AudioContext();
  const audioDest = audioContext.createMediaStreamDestination();
  const audioSrc = audioContext.createMediaElementSource(videoInput);

  audioSrc.connect(audioDest); // Play audio to stream destination for recording
  if (playback) {
    audioSrc.connect(audioContext.destination) // Play audio to user
  };
  
  return audioDest.stream.getAudioTracks()[0];
};

const outputRecorder = ({
  videoInput,
  canvasOutput,
  audioTrack,
}) => {
  canvasOutput.getContext('2d'); // Without first calling getContext, captureStream() may fail
  const mediaStream = canvasOutput.captureStream();
  mediaStream.addTrack(audioTrack); // By adding audio track, the final downloaded video will have original audio

  const mediaRecorder = new MediaRecorder(
     mediaStream,
    { mimeType: 'video/webm' },
  );

  const outputBlobs = [];
  const handleDataAvailable = (event) => {
    if (event.data && event.data.size > 0) {
      outputBlobs.push(event.data);
    }
    const blob = new Blob(outputBlobs, {type: 'video/webm'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
  mediaRecorder.ondataavailable = handleDataAvailable;

  return mediaRecorder;
};

const initVideo = ({
  videoInput,
  canvasOutput,
  mediaRecorder,
  streaming
}) => (
  (streaming)
    ? true
    : (videoInput.addEventListener("canplaythrough", (event) => {

      if (!streaming) {
        const videoWidth = videoInput.videoWidth;
        const videoHeight = videoInput.videoHeight;
        videoInput.setAttribute("width", videoWidth);
        videoInput.setAttribute("height", videoHeight);
        canvasOutput.width = videoWidth;
        canvasOutput.height = videoHeight;    
        videoInput.play();
        mediaRecorder.start(); 
  startProcessing({
      videoInput: videoInput,
      canvasOutput: canvasOutput,
      canvasInput: canvasInputElement(videoInput),
      detectFace: true,
  });
      }
    }, false) === undefined)
);
const canvasInputElement = (videoInput) => {
  const canvasInput = document.createElement('canvas');
  canvasInput.width = videoInput.videoWidth;
  canvasInput.height = videoInput.videoHeight;
  
  const canvasBuffer = document.createElement('canvas');
  canvasBuffer.width = videoInput.videoWidth;
  canvasBuffer.height = videoInput.videoHeight;
  return canvasInput;
};
  
const startProcessing = ({
  videoInput,
  canvasOutput,
  canvasInput,
  detectFace,
}) => {
  const srcMat = new cv.Mat(videoInput.videoHeight, videoInput.videoWidth, cv.CV_8UC4);

  const faceClassifier = new cv.CascadeClassifier();
  const utils = new Utils('errorMessage', cv);

  const faceCascadeFile = 'haarcascade_frontalface_default.xml';
  const modelFile = 'res10_300x300_ssd_iter_140000.caffemodel';
  const protoFile = 'opencv_face_detector.prototxt';
  console.log(cv.getBuildInformation());
  const acceptConfidence = 0.1;
  
  // Adapted from noone_video
  const findFaceDeep = () => (
    utils.createFileFromUrl(modelFile, modelFile, () => (
      utils.createFileFromUrl(protoFile, protoFile, () => {
        const net = cv.readNetFromCaffe(protoFile, modelFile); 
        const processFrame = () => {
          canvasInput.getContext('2d').drawImage(
            videoInput,
            0,
            0,
          );
          const imageData = canvasInput.getContext('2d').getImageData(
            0,
            0,
            videoInput.videoWidth,
            videoInput.videoHeight,
          );
          srcMat.data.set(imageData.data);
          const bgrMat = new cv.Mat(videoInput.videoHeight, videoInput.videoWidth, cv.CV_8UC3);
          cv.cvtColor(srcMat, bgrMat, cv.COLOR_RGBA2BGR);
          const blob = cv.blobFromImage(
            bgrMat,
            1.0,
            {width: 300, height: 300},
            [104, 177, 123, 0],
            false,
            false,
          );
          net.setInput(blob);
          const out = net.forward();
          const faces = [];
          for (var i = 0, n = out.data32F.length; i < n; i += 7) {
            const confidence = out.data32F[i + 2];
            let left = out.data32F[i + 3] * bgrMat.cols;
            let top = out.data32F[i + 4] * bgrMat.rows;
            let right = out.data32F[i + 5] * bgrMat.cols;
            let bottom = out.data32F[i + 6] * bgrMat.rows;
            left = Math.min(Math.max(0, left), bgrMat.cols - 1);
            right = Math.min(Math.max(0, right), bgrMat.cols - 1);
            bottom = Math.min(Math.max(0, bottom), bgrMat.rows - 1);
            top = Math.min(Math.max(0, top), bgrMat.rows - 1);
            if (confidence > acceptConfidence && left < right && top < bottom) {
              faces.push({x: left, y: top, width: right - left, height: bottom - top});
              //faces.push(new cv.Rect(left, top, right - left, bottom - top));
            }
          }
          blob.delete();
          out.delete();
          
          canvasOutput.getContext('2d').drawImage(canvasInput, 0, 0);
          drawOutputBasic({
            contextOutput: canvasOutput.getContext('2d'),
            results: faces,
            color: 'red',
            videoWidth: videoInput.videoWidth,
            videoHeight: videoInput.videoHeight,
          });
          requestAnimationFrame(processFrame);
        };
        requestAnimationFrame(processFrame);
      })
    ))
  );

  const findFaceHaar = () => (
    utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
     faceClassifier.load(faceCascadeFile);
      const processFrame = () => {
        canvasInput.getContext('2d').drawImage(
          videoInput,
          0,
          0,
        );
        const imageData = canvasInput.getContext('2d').getImageData(
          0,
          0,
          videoInput.videoWidth,
          videoInput.videoHeight,
        );
        srcMat.data.set(imageData.data);
        const grayMat = new cv.Mat(videoInput.videoHeight, videoInput.videoWidth, cv.CV_8UC1);
        cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);
        const faces = [];
        let size;
        const faceVect = new cv.RectVector();
        const faceMat = new cv.Mat();
        if (true) {
            cv.pyrDown(grayMat, faceMat);
            size = faceMat.size();
          } else {
            cv.pyrDown(grayMat, faceMat);
            cv.pyrDown(faceMat, faceMat);
            size = faceMat.size();
          }
        faceClassifier.detectMultiScale(faceMat, faceVect);
        for (let i = 0; i < faceVect.size(); i++) {
          let face = faceVect.get(i);
          faces.push(new cv.Rect(face.x, face.y, face.width, face.height));
        }
        faceMat.delete();
        faceVect.delete();

        canvasOutput.getContext('2d').drawImage(canvasInput, 0, 0);

        drawOutput({
          contextOutput: canvasOutput.getContext('2d'),
          results: faces,
          color: 'red',
          size: size,
          videoWidth: videoInput.videoWidth,
          videoHeight: videoInput.videoHeight,
        });
        requestAnimationFrame(processFrame);
      };
      requestAnimationFrame(processFrame);
    })
  );

  findFaceDeep();
};

function drawOutputBasic({
  contextOutput,
  results,
  color,
  videoWidth,
  videoHeight,
}) {
  for (let i = 0; i < results.length; ++i) {
    let rect = results[i];
    contextOutput.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
}
function drawOutput({
  contextOutput,
  results,
  color,
  size,
  videoWidth,
  videoHeight,
}) {
  for (let i = 0; i < results.length; ++i) {
    let rect = results[i];
    let xRatio = videoWidth/size.width;
    console.log(rect.x*xRatio);
    let yRatio = videoHeight/size.height;
    contextOutput.fillRect(rect.x*xRatio, rect.y*yRatio, rect.width*xRatio, rect.height*yRatio);
  }
}
export default App;



