const constraints = {
  audio: false,
    video: { frameRate: { min:30 } }
  };
  
  var video = document.getElementById("videoElement");
  var canvasPrev = document.createElement("canvas");
  var canvasCurr = document.createElement("canvas");
  var canvasDiff = document.getElementById("diffCanvas");
  var canvasFace = document.getElementById("faceCanvas");
  var ctxPrev = canvasPrev.getContext("2d");
  var ctxCurr = canvasCurr.getContext("2d");
  var ctxDiff = canvasDiff.getContext("2d");

  //models for face detection
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
  ]);
  
  setWebcam();

  const width = 600;
  const height = 450;
  const sizes = { width: 600, height: 450 };
  faceapi.matchDimensions(canvasFace, sizes);
  //constants - may be changed for different sensitivity
  //method 1
  const pixelChangeIntervalConstant = 5;
  const pixelChangeMotionConstant = 1;
  var pixelChangePrev = 0;
  //method 2
  const colorChangeMotionConstant = 0.5;
  var avgColorChangePrev = 0;
  //method 3
  const diffChangePixelMotionConstant = 75;
  const diffChangeImageMotionConstant = 50;
  var diffChangePixelPrev = 0;

  var timer = setInterval("calculateChange()", 100);

   function setWebcam(){
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      navigator.mediaDevices.getUserMedia(constraints)
          .then(function (stream) {
              video.srcObject = stream;
          });
      }
    else{
        window.alert("Browser not supporting getUserMedia API");
    }
  }

  //calculates change between two frames
  function calculateChange(){
      
      screenshot();
      //method 1
      pixelChange();
      //method 2
      colorChange();
      //method 3
      diffingChange();

      canvasPrev.width = width;
      canvasPrev.height = height;
      ctxPrev.putImageData(ctxCurr.getImageData(0,0,width,height),0,0);
  }
  
  function screenshot(){
    canvasCurr.width = width;
    canvasCurr.height = height;
    ctxCurr.drawImage(video, 0,0,width,height);
  }
  
  //calculates change based on pixel comparision
  function pixelChange(){
      const pixelNumber = height*width;
      var changedPixels = 0;

      var imgData1 = ctxPrev.getImageData(0, 0, width, height);
      var imgData2 = ctxCurr.getImageData(0, 0, width, height);
      var i;
      for (i = 0; i<imgData1.data.length; i+=4){
          if(!(imgData1.data[i]+pixelChangeIntervalConstant>=imgData2.data[i] && imgData1.data[i]-pixelChangeIntervalConstant<=imgData2.data[i] &&
            imgData1.data[i+1]+pixelChangeIntervalConstant>=imgData2.data[i+1] && imgData1.data[i+1]-pixelChangeIntervalConstant<=imgData2.data[i+1] && 
            imgData1.data[i+2]+pixelChangeIntervalConstant>=imgData2.data[i+2] && imgData1.data[i+2]-pixelChangeIntervalConstant<=imgData2.data[i+2])){
              changedPixels++;
          }
      }
      updateChange1((changedPixels/pixelNumber*100).toFixed(2));
  }

  //calculates change based on the average color difference between pixels
  function colorChange(){
      const pixelNumber = height*width;
      var pointsChanged = 0;
      var imgData1 = ctxPrev.getImageData(0, 0, width, height);
      var imgData2 = ctxCurr.getImageData(0, 0, width, height);
      var i;
      for (i = 0; i<imgData1.data.length; i+=4){
          pointsChanged += Math.abs(imgData1.data[i] - imgData2.data[i]);
          pointsChanged += Math.abs(imgData1.data[i+1] - imgData2.data[i+1]);
          pointsChanged += Math.abs(imgData1.data[i+2] - imgData2.data[i+2]);
      }
      updateChange2((pointsChanged/pixelNumber).toFixed(2));
      
  }

  //calculates change based on technique called diffing
  function diffingChange(){
    var changedPixels = 0;
      var imgData1 = ctxPrev.getImageData(0, 0, width, height);
      var imgData2 = ctxCurr.getImageData(0, 0, width, height);
      var imgDataDiff = ctxDiff.createImageData(imgData1);
      var i;
      for (i = 0; i<imgDataDiff.data.length; i+=4){
        imgDataDiff.data[i] = Math.abs(imgData1.data[i] - imgData2.data[i]);
        imgDataDiff.data[i+1] = Math.abs(imgData1.data[i+1] - imgData2.data[i+1]);
        imgDataDiff.data[i+2] = Math.abs(imgData1.data[i+2] - imgData2.data[i+2]);
        imgDataDiff.data[i+3] = 255;
    }
    ctxDiff.putImageData(imgDataDiff,0,0);

    for (i = 0; i<imgDataDiff.data.length; i+=4){
      let rgbSum = 0;
      rgbSum += imgDataDiff.data[i];
      rgbSum += imgDataDiff.data[i+1];
      rgbSum += imgDataDiff.data[i+2];
      if(rgbSum>=diffChangePixelMotionConstant){
        changedPixels++;
      }
    }
    updateChange3(changedPixels);
  }

  //updates changes calculated by method 1
  function updateChange1(percentualChange){
    document.getElementById("changePercentage").innerHTML = percentualChange;
    if(Math.abs(percentualChange-pixelChangePrev)>=pixelChangeMotionConstant){
        document.getElementById("indicator1").style.fill = "green";
    }
    else{
        document.getElementById("indicator1").style.fill = "red";
    }
    pixelChangePrev = percentualChange;
  }

  //updates changes calculated by method 2
  function updateChange2(avgColorChangeCurr){
    document.getElementById("averageColorChange").innerHTML = avgColorChangeCurr;
    if(Math.abs(avgColorChangeCurr-avgColorChangePrev)<colorChangeMotionConstant){
        document.getElementById("indicator2").style.fill = "red";
    }
    else{
        document.getElementById("indicator2").style.fill = "green";
    }
    avgColorChangePrev = avgColorChangeCurr;
  }

  //updates changes calculated by method 3
  function updateChange3(changedPixels){
    document.getElementById("pixelChange").innerHTML = changedPixels;
    if(Math.abs(changedPixels-diffChangePixelPrev)<diffChangeImageMotionConstant){
      document.getElementById("indicator3").style.fill = "red";
  }
  else{
      document.getElementById("indicator3").style.fill = "green";
  }
  diffChangePixelPrev = changedPixels;
  }

  //detects face
  video.addEventListener('playing', () => {
    setInterval( async () => {
      var attributes = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      if(attributes.length == 0){
        updateFaceChange(false);
      }
      else{
        updateFaceChange(true);
      }
      var resize = faceapi.resizeResults(attributes, sizes);
      canvasFace.getContext('2d').clearRect(0, 0, canvasFace.width, canvasFace.height);
      faceapi.draw.drawDetections(canvasFace, resize);
      faceapi.draw.drawFaceLandmarks(canvasFace, resize);
      faceapi.draw.drawFaceExpressions(canvasFace, resize);
    } ,100);
  });

  //updates face indicator
  function updateFaceChange(found){
    if(!found){
      document.getElementById("faceIndicator").style.fill = "red";
    }
    else{
      document.getElementById("faceIndicator").style.fill = "green";
    }
  }