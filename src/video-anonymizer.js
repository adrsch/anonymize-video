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

const URL = (window.URL || window.webkitURL);

const VideoAnonymizer = (props) => {
  const classes = useStyles();
  const [waiting, setWaiting] = useState(false);
  const [videoInput, setVideoInput] = useState(false);
  const [canvasOutput, setCanvasOutput] = useState(false);
  useEffect(() => {
    if (videoInput && canvasOutput) {
      runAnon({
        videoInput: videoInput,
        canvasOutput: canvasOutput,
        video: props.video,
        options: props.options,
        setWaiting: setWaiting,
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


const runAnon = ({
  videoInput,
  canvasOutput,
  video,
  options,
  setWaiting,
}) => {
  preProcess({
    videoInput: videoInput,
    videoUrl: URL.createObjectURL(video),
    name: video.name,
    type: video.type,
    options: options,
    setWaiting: setWaiting,
  });
  initVideo({
    videoInput: videoInput,
    canvasOutput: canvasOutput,
    detection: options.detection,
    mediaRecorder: outputRecorder({
      videoInput: videoInput,
      canvasOutput: canvasOutput,
      audioTrack: outputAudioTrack({
        videoInput: videoInput,
        playAudio: false,
      }),
      playbackRate: options.playbackRate,
      videoUrl: URL.createObjectURL(video),
      setWaiting: setWaiting,
    }),
    setWaiting: setWaiting,
  });
};

const preProcess = ({
  videoInput,
  videoUrl,
  name,
  type,
  options,
  setWaiting,
}) => {
  setWaiting('Setting up...');
  const ffmpeg = createWorker({
    logger: ({ message }) => console.log(message),
  });
  (async () => {
    await ffmpeg.load();
    await ffmpeg.write(name, videoUrl);
    setWaiting('Preprocessing video...');
    if (options.scaleFactor === 1) {
      await ffmpeg.run(`-itsscale ${1/options.playbackRate} -i ${name} -c copy input${name}`); // fast
    }
    else {
      await ffmpeg.run(`-i ${name} -filter:v setpts=PTS/${options.playbackRate} scale=iw*${options.scaleFactor}:ih*${options.scaleFactor} -max_muxing_queue_size 4096 input${name}`); // slow
    }
    const data = (await ffmpeg.read(`input${name}`)).data;
    const blob = new Blob([data.buffer], {type:type});
    videoInput.src = URL.createObjectURL(blob);
  })();
};


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

const convertVideo = ({
  anonUrl,
  videoUrl,
  playbackRate,
  setWaiting,
}) => {
  const ffmpeg = createWorker({
          logger: ({ message }) => console.log(message),
        });
  (async () => {
    setWaiting('Converting video...');
    await ffmpeg.load();
    await ffmpeg.write('video.webm', anonUrl);
    //await ffmpeg.run(`-i video.webm -filter:v setpts=${playbackRate}*PTS out.webm`);
    await ffmpeg.run(`-itsscale ${playbackRate} -i video.webm -c copy normalspeed.webm`);
    await ffmpeg.write('video.webm', anonUrl);
    await ffmpeg.run('-i normalspeed.webm');
    //await ffmpeg.transcode('video.webm', 'out.mp4');
    const data = (await ffmpeg.read('out.webm')).data;
    const blob = new Blob([data.buffer], {type:'video/webm'});
    setWaiting(false);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(anonUrl);
      window.URL.revokeObjectURL(videoUrl);
    }, 100);
  })();
};

const outputRecorder = ({
  videoInput,
  canvasOutput,
  audioTrack,
  playbackRate,
  videoUrl,
  setWaiting,
}) => {
  canvasOutput.getContext('2d'); // Without calling getContext first, captureStream() fails
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
    const anonUrl = window.URL.createObjectURL(blob);
    convertVideo({
      anonUrl: anonUrl,
      videoUrl: videoUrl,
      playbackRate: playbackRate,
      setWaiting: setWaiting,
    });
  }
  mediaRecorder.ondataavailable = handleDataAvailable;

  return mediaRecorder;
};

const initVideo = ({
  videoInput,
  canvasOutput,
  detection,
  mediaRecorder,
  setWaiting,
}) => {
  videoInput.addEventListener("ended", (event) => {
    mediaRecorder.stop();
  });
  videoInput.addEventListener("canplaythrough", (event) => {
    const videoWidth = videoInput.videoWidth;
    const videoHeight = videoInput.videoHeight;
    videoInput.setAttribute("width", videoWidth);
    videoInput.setAttribute("height", videoHeight);
    canvasOutput.width = videoWidth;
    canvasOutput.height = videoHeight;
    setWaiting(false);
    videoInput.play();
    mediaRecorder.start();
    startProcessing({
      videoInput: videoInput,
      canvasOutput: canvasOutput,
      canvasInput: canvasInputElement(videoInput),
      detection: detection,
    });
  });
};

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
  detection,
}) => {
  const srcMat = new cv.Mat(videoInput.videoHeight, videoInput.videoWidth, cv.CV_8UC4);

  const faceClassifier = new cv.CascadeClassifier();
  const utils = new Utils('errorMessage', cv);

  const faceCascadeFile = 'haarcascade_frontalface_default.xml';
  const modelFile = 'res10_300x300_ssd_iter_140000.caffemodel';
  const protoFile = 'opencv_face_detector.prototxt';
  console.log(cv.getBuildInformation());
  const acceptConfidence = 0.1;

  const detect = {
    deep: () => (
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
            if (true) { requestAnimationFrame(processFrame); }
          };
          requestAnimationFrame(processFrame);
        })
      ))
    ),
    haar: () => (
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
    ),
  };

  detect[detection]();
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
    let yRatio = videoHeight/size.height;
    contextOutput.fillRect(rect.x*xRatio, rect.y*yRatio, rect.width*xRatio, rect.height*yRatio);
  }
}

export default VideoAnonymizer;
