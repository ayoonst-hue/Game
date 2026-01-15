/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 *
 * PoseEngine, GameEngine, Stabilizer를 조합하여 애플리케이션을 구동
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;

/**
 * 애플리케이션 초기화
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 1. PoseEngine 초기화
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 500, // 게임 화면을 위해 조금 더 키움 (300 -> 500)
      flip: true
    });

    // 2. Stabilizer 초기화 (떨림 방지)
    stabilizer = new PredictionStabilizer({
      threshold: 0.85,    // 확률 임계값 조정 (0.9 -> 0.85)
      smoothingFrames: 7  // 7프레임 동안 유지해야 인정 (사용자 요청)
    });

    // 3. GameEngine 초기화
    gameEngine = new GameEngine();
    // 캔버스 크기 정보를 엔진에 전달
    gameEngine.gameWidth = 500;
    gameEngine.gameHeight = 500;

    // 4. 캔버스 설정
    const canvas = document.getElementById("canvas");
    canvas.width = 500;
    canvas.height = 500;
    ctx = canvas.getContext("2d");

    // 5. Label Container 설정
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = ""; // 초기화
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. PoseEngine 콜백 설정
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawPose);

    // 7. 게임 이벤트 연결
    gameEngine.setScoreChangeCallback((score, level, lives) => {
      // 필요시 UI 업데이트
      console.log(`Score: ${score}, Level: ${level}`);
    });

    gameEngine.setGameEndCallback((finalScore, finalLevel) => {
      alert(`게임 종료! 최종 점수: ${finalScore}점`);
      stop();
    });

    // 8. PoseEngine 시작
    poseEngine.start();

    // 게임도 바로 시작 (또는 별도 버튼으로 분리 가능)
    gameEngine.start();

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) {
    poseEngine.stop();
  }

  if (gameEngine) {
    gameEngine.stop();
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백
 * @param {Array} predictions - TM 모델의 예측 결과
 * @param {Object} pose - PoseNet 포즈 데이터
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilizer로 예측 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Label Container 업데이트 (디버그용)
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  // 3. 최고 확률 예측 표시
  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "감지 중...";

  // 4. GameEngine에 포즈 전달
  if (gameEngine && stabilized.className) {
    gameEngine.setBasketPosition(stabilized.className);
  }
}

/**
 * 포즈 그리기 및 게임 렌더링 루프
 * @param {Object} pose - PoseNet 포즈 데이터
 */
function drawPose(pose) {
  // A. 웹캠 그리기
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0, 500, 500);
  }

  // B. 게임 엔진 업데이트 및 그리기 (AR 효과)
  if (gameEngine) {
    gameEngine.update(performance.now());
    gameEngine.draw(ctx);
  }

  // C. 스켈레톤 그리기 (선택사항, 게임에 방해되면 주석 처리)
  //   if (pose) {
  //     const minPartConfidence = 0.5;
  //     tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
  //     tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
  //   }
}

