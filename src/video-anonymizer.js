import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import cv from './vendor/opencv-4.3.0';
import Utils from './vendor/utils';
import { createWorker } from '@ffmpeg/ffmpeg';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';

const URL = (window.URL || window.webkitURL);

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  row: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    minWidth: '100%',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}));

const VideoAnonymizer = ({
  video,
  options,
}) => {
  const classes = useStyles();
  const [waiting, setWaiting] = useState('Setting up...');
  const [videoInput, setVideoInput] = useState(false);
  const [canvasOutput, setCanvasOutput] = useState(false);

  useEffect(() => {
     // Begin anonymization once required elements are in DOM
    if (videoInput && canvasOutput) {
      const inputUrl = URL.createObjectURL(video);
      const ffmpeg = createWorker({
        logger: (process.env.REACT_APP_STAGE === 'PROD') // Only log in development
          ? false
          : ({ message }) => console.log(message),
        log: process.env.REACT_APP_STAGE !== 'PROD',
      });
      const mediaRecorder = outputRecorder({
        videoInput: videoInput,
        canvasOutput: canvasOutput,
        audioTrack: false, // To add audio for playback, use outputAudioTrack
        inputUrl: inputUrl,
      });

      videoInput.addEventListener('canplaythrough', (event) => {
        const videoWidth = videoInput.videoWidth;
        const videoHeight = videoInput.videoHeight;
        videoInput.setAttribute("width", videoWidth);
        videoInput.setAttribute("height", videoHeight);
        canvasOutput.width = videoWidth;
        canvasOutput.height = videoHeight;
        setWaiting(false);
        processVideo({
          videoInput: videoInput,
          mediaRecorder: mediaRecorder,
          canvasOutput: canvasOutput,
          canvasInput: canvasInputElement(videoInput),
          options: options,
        });
      });

      // Stopping the mediaRecorder will trigger conversion and download through ondataavailable event
      videoInput.addEventListener('ended', (event) => {
        mediaRecorder.stop();
      });

      const outputBlobs = []; // Closure for state representation
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          outputBlobs.push(event.data);
        }
        const blob = new Blob(outputBlobs, {type: 'video/webm'});
        const outputUrl = window.URL.createObjectURL(blob);
        postprocessVideo({
          ffmpeg: ffmpeg,
          outputUrl: outputUrl,
          inputUrl: inputUrl,
          playbackRate: options.playbackRate,
          callback: downloadVideo,
        });
      };

      setWaiting('Preprocessing video...');
      preprocessVideo({
        ffmpeg: ffmpeg,
        inputUrl: inputUrl,
        type: video.type,
        options: options,
        callback: (url) => { videoInput.src = url; },
      });
    }
  }, [videoInput, canvasOutput]);

  return (
    <div className={clsx(classes.root)}>
      {(waiting !== false)
        ? (
          <div className={clsx(classes.container)}>
            <div className={clsx(classes.row)}>
            <CircularProgress />
            </div>
            <div className={clsx(classes.row)}>
            <Typography>
              {waiting}
              </Typography>
          </div>
          </div>
        )
        : null
      }
      <div className={clsx(classes.container)}>
        <div className={clsx(classes.row)}>
          <video ref={(el) => setVideoInput(el)}></video>
        </div>
        <div className={clsx(classes.row)}>
          <canvas ref={(el) => setCanvasOutput(el)}></canvas>
        </div>
      </div>
    </div>
  );
}

const downloadVideo = (url) => {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'video.mp4';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
};

const canvasInputElement = (videoInput) => {
  const canvasInput = document.createElement('canvas');
  canvasInput.width = videoInput.videoWidth;
  canvasInput.height = videoInput.videoHeight;
  return canvasInput;
};

// Returns media recorder set upfor capturing the canvas stream, with the possibility of capturing audio
const outputRecorder = ({
  canvasOutput,
  audioTrack,
}) => {
  canvasOutput.getContext('2d'); // Without calling getContext first, captureStream() fails
  const mediaStream = canvasOutput.captureStream();

  if (audioTrack) {
    mediaStream.addTrack(audioTrack); // By adding audio track, the final downloaded video will have original audio without using ffmpeg
  }

  return new MediaRecorder(
     mediaStream,
    { mimeType: 'video/webm' },
  );
};

// Returns audio track from video - can be used to play audio to a media recorder and back to the user
const outputAudioTrack = ({
  videoInput,
  playAudio,
}) => {
  const audioContext = new AudioContext();
  const audioDest = audioContext.createMediaStreamDestination();
  const audioSrc = audioContext.createMediaElementSource(videoInput);

  audioSrc.connect(audioDest); // Play audio to stream destination for recording
  if (playAudio) {
    audioSrc.connect(audioContext.destination) // Play audio to user
  };

  return audioDest.stream.getAudioTracks()[0];
};

// Slows & shrinks the video, calls back with URL
const preprocessVideo = async ({
  ffmpeg,
  inputUrl,
  options,
  callback,
}) => {
  await ffmpeg.load();
  await ffmpeg.write('videoinput', inputUrl);
  if (options.scaleFactor === 1) {
    await ffmpeg.run(`-itsscale ${1/options.playbackRate} -i videoinput -c copy -an videoslow.mp4`); // Fast
  }
  else {
    await ffmpeg.run(`-i videoinput -filter:v setpts=PTS/${options.playbackRate} scale=iw*${options.scaleFactor}:ih*${options.scaleFactor} -max_muxing_queue_size 4096 -an videoslow.mp4`); // Slow
  }
  const data = (await ffmpeg.read('videoslow.mp4')).data;
  const blob = new Blob([data.buffer], {type:'video/mp4'});
  callback(URL.createObjectURL(blob));
};

// Speeds up, adds audio, and converts the video, calls back with URL
const postprocessVideo = async ({
  ffmpeg,
  outputUrl,
  inputUrl,
  playbackRate,
  callback,
}) => {
  await ffmpeg.load();
  await ffmpeg.write('slow.webm', outputUrl);
  await ffmpeg.run(`-itsscale ${playbackRate} -i slow.webm -c copy out.webm`);
  await ffmpeg.write('originalVideo', inputUrl);
  await ffmpeg.transcode('out.webm', 'out.mp4');
  await ffmpeg.run('-i out.mp4 -i originalVideo -c copy -map 0:v:0 -map 1:a:0 video.mp4');
  const data = (await ffmpeg.read('video.mp4')).data;
  const blob = new Blob([data.buffer], {type:'video/mp4'});
  callback(URL.createObjectURL(blob));
};

const models = {
  multiFace: {
    type: 'haar',
    xml: [
      'haarcascade_frontalface_default.xml',
      'haarcascade_frontalface_alt_tree.xml',
      'haarcascade_frontalface_alt2.xml',
      'haarcascade_frontalface_alt.xml',
    ],
  },
  haarFace: {
    type: 'haar',
    xml: [ 'haarcascade_frontalface_default.xml' ],
  },
  haarProf: {
    type: 'haar',
    xml: [ 'haarcascade_profileface.xml' ],
  },
  haarUpper: {
    type: 'haar',
    xml: [ 'haarcascade_upperbody.xml' ],
  },
  haarFull: {
    type: 'haar',
    xml: [ 'haarcascade_fullbody.xml' ],
  },
  multiEye: {
    type: 'haar',
    xml: [
      'haarcascade_eye.xml',
      'haarcascade_eye_tree_eyeglasses.xml',
      'haarcascade_lefteye_2splits.xml',
      'haarcascade_righteye_2splits.xml',
    ],
  },
  deepFace: {
    type: 'deep',
    model: 'res10_300x300_ssd_iter_140000.caffemodel',
    proto: 'opencv_face_detector.prototxt',
  },
};

const drawingFunctions = {
  blackRect: (detected, ctx) => {
    for (let i = 0; i < detected.length; ++i) {
      const rect = detected[i];
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
  },
  blackCirc: (detected, ctx) => {
    for (let i = 0; i < detected.length; ++i) {
      const rect = detected[i];
      ctx.save();
      ctx.scale(1, rect.height / rect.width);
      ctx.beginPath();
      ctx.arc(
        rect.x + (rect.width / 2),
        rect.y + (rect.height / 2),
        rect.width / 2,
        0,
        2 * Math.PI,
        false,
      );
      ctx.fill();
      ctx.closePath();
      ctx.restore();
    }
  },
}

const processVideo = ({
  videoInput,
  mediaRecorder,
  canvasOutput,
  canvasInput,
  options,
}) => {
  const drawOutput = drawingFunctions[options.draw];
  const acceptConfidence = options.threshold;

  const utils = new Utils('errorMessage', cv);
  const srcMat = new cv.Mat(videoInput.videoHeight, videoInput.videoWidth, cv.CV_8UC4);

  const detectDeep = (net) => {
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
    const detected = [];
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
        detected.push({x: left, y: top, width: right - left, height: bottom - top});
      }
    }
    blob.delete();
    out.delete();

    canvasOutput.getContext('2d').drawImage(canvasInput, 0, 0);
    drawOutput(detected, canvasOutput.getContext('2d'));
  };
  const detectHaar = (classifier) => {
    const grayMat = new cv.Mat(videoInput.videoHeight, videoInput.videoWidth, cv.CV_8UC1);
    cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);
    const detected = [];
    const faceVect = new cv.RectVector();
    const faceMat = new cv.Mat();
    cv.pyrDown(grayMat, faceMat);
    const size = faceMat.size();
    const xRatio = videoInput.videoWidth / size.width;
    const yRatio = videoInput.videoHeight / size.height;
    classifier.detectMultiScale(faceMat, faceVect);
    for (let i = 0; i < faceVect.size(); i++) {
      let face = faceVect.get(i);
      detected.push({
        x: face.x * xRatio,
        y: face.y * yRatio,
        width: face.width * xRatio,
        height: face.height * yRatio,
      });
    }
    faceMat.delete();
    faceVect.delete();

    drawOutput(detected, canvasOutput.getContext('2d'));
  };

  const makeProcessFrameCallback = (selectedModels) => () => {
    const models = selectedModels.map(details => (details.type === 'deep')
      ? cv.readNetFromCaffe(details.proto, details.model)
      : details.xml.map(xml => loadCascadeClassifier(xml))
    );
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
      canvasOutput.getContext('2d').drawImage(canvasInput, 0, 0);
      srcMat.data.set(imageData.data);
      for (let model = 0; model < models.length; model++) {
        if (selectedModels[model].type === 'deep') {
          detectDeep(models[model]);
        }
        else {
          for (let classifier = 0; classifier < models[model].length; classifier++) {
            detectHaar(models[model][classifier]);
          }
        }
      }
      requestAnimationFrame(processFrame);
    }

    videoInput.play();
    mediaRecorder.start();
    requestAnimationFrame(processFrame);
  };

  const loadCascadeClassifier = (xml) => {
    const classifier = new cv.CascadeClassifier();
    classifier.load(xml);
    return classifier;
  };

  const selectedModels = Object.entries(models)
    .filter(([name, details]) => options[name])
    .map(([name, details]) => details);

  const setupFileCreation = (file) => (
    callback=makeProcessFrameCallback(selectedModels) // If a callback to create the next file is not passed, use a callback to begin processing
  ) => utils.createFileFromUrl(file, file, callback);

  // Generate a list of callbacks for setting up files to be chained
  selectedModels.map(details => (details.type === 'deep')
      ? [details.model, details.proto]
      : details.xml
    )
    .flat()
    .map(file => setupFileCreation(file))
    // Load all resources, then use the final callback to start processing frames
    .reduce((create, nextCreator) => () => nextCreator(create))();
};

export default VideoAnonymizer;
