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
// 페이지 로드 시 카메라 초기화
window.onload = function () {
  initCamera();
};

/**
 * 카메라 및엔진 초기화 (페이지 로드 시 자동 실행)
 */
async function initCamera() {
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = true;
  startBtn.innerText = "Loading Camera...";

  try {
    // 1. PoseEngine 초기화
    poseEngine = new PoseEngine("./my_model/");
    await poseEngine.init({
      size: 500,
      flip: true
    });

    // 2. Stabilizer 초기화
    stabilizer = new PredictionStabilizer({
      threshold: 0.85,
      smoothingFrames: 7
    });

    // 3. GameEngine 초기화 (아직 시작은 안함)
    gameEngine = new GameEngine();
    gameEngine.gameWidth = 500;
    gameEngine.gameHeight = 500;

    // 4. 캔버스 설정
    const canvas = document.getElementById("canvas");
    canvas.width = 500;
    canvas.height = 500;
    ctx = canvas.getContext("2d");

    // 5. PoseEngine 콜백 설정
    poseEngine.setPredictionCallback(handlePrediction);
    poseEngine.setDrawCallback(drawPose);

    // 6. 게임 이벤트 연결
    gameEngine.setScoreChangeCallback((score, level, lives) => {
      console.log(`Score: ${score}, Level: ${level}`);
    });

    gameEngine.setGameEndCallback((finalScore, finalLevel) => {
      alert(`게임 종료! 최종 점수: ${finalScore}점`);
      stopGame();
    });

    // 7. 카메라 시작 (게임 엔진은 멈춘 상태)
    poseEngine.start();

    // 준비 완료
    startBtn.disabled = false;
    startBtn.innerText = "Game Start";

  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("카메라를 사용할 수 없습니다. 권한을 확인해주세요.");
    startBtn.innerText = "Camera Error";
  }
}

/**
 * 게임 시작 (Start 버튼 클릭 시)
 */
function startGame() {
  if (!gameEngine) return;

  // 화면 전환
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  // 게임 엔진 시작
  gameEngine.start();
}

/**
 * 게임 중지 및 메인 화면 복귀
 */
function stopGame() {
  if (gameEngine) {
    gameEngine.stop();
  }

  // 화면 전환
  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("start-screen").classList.remove("hidden");
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

