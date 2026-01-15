/**
 * gameEngine.js
 * 과일 받기 게임(Falling Fruits)의 핵심 로직을 담당
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.isGameActive = false;

    // 게임 오브젝트 상태
    this.basketPosition = 1; // 0: Left, 1: Center, 2: Right
    this.fallingObjects = []; // 떨어지는 물체들 배

    // 게임 설정
    this.gameWidth = 200;  // 캔버스 크기에 맞춤
    this.gameHeight = 200;
    this.basketY = 170;    // 바구니 Y 위치
    this.laneWidth = this.gameWidth / 3; // 3개 레인

    // 타이밍 관련
    this.lastSpawnTime = 0;
    this.spawnInterval = 1500; // 1.5초마다 생성 (레벨업시 감소)
    this.lastTime = 0;

    // 콜백
    this.onScoreChange = null;
    this.onGameEnd = null;
  }

  /**
   * 게임 시작
   */
  start() {
    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.fallingObjects = [];
    this.lastSpawnTime = 0;
    this.spawnInterval = 1500;
    this.lastTime = performance.now();

    // 초기 바구니 위치 (중앙)
    this.basketPosition = 1;

    console.log("Game Started! Catch the fruits!");
  }

  /**
   * 게임 중지
   */
  stop() {
    this.isGameActive = false;
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  /**
   * 바구니 위치 설정 (AI 모델 결과 연결)
   * @param {string} poseLabel - "LEFT", "CENTER", "RIGHT"
   */
  setBasketPosition(poseLabel) {
    if (poseLabel === "LEFT") this.basketPosition = 0;
    else if (poseLabel === "CENTER") this.basketPosition = 1;
    else if (poseLabel === "RIGHT") this.basketPosition = 2;
  }

  /**
   * 게임 상태 업데이트 (프레임마다 호출)
   * @param {number} currentTime - 현재 시간 (ms)
   */
  update(currentTime) {
    if (!this.isGameActive) return;

    // 델타 타임 계산 (초 단위)
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 1. 새로운 물체 생성
    if (currentTime - this.lastSpawnTime > this.spawnInterval) {
      this.spawnObject();
      this.lastSpawnTime = currentTime;
    }

    // 2. 물체 이동 및 상태 업데이트
    for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
      const obj = this.fallingObjects[i];

      // 속도만큼 아래로 이동
      obj.y += obj.speed * deltaTime;

      // A. 충돌 감지 (바구니와 닿았는지)
      // 바구니의 중앙 Y 위치 즈음 + 같은 레인에 있는지 확인
      if (
        obj.y >= this.basketY - 20 &&
        obj.y <= this.basketY + 20 &&
        obj.lane === this.basketPosition
      ) {
        this.handleCollision(obj);
        this.fallingObjects.splice(i, 1); // 제거
        continue;
      }

      // B. 바닥에 닿았을 때 (놓침)
      if (obj.y > this.gameHeight) {
        this.handleMiss(obj);
        this.fallingObjects.splice(i, 1); // 제거
      }
    }
  }

  /**
   * 물체 생성
   */
  spawnObject() {
    // 0, 1, 2 중 랜덤 레인
    const lane = Math.floor(Math.random() * 3);

    // 아이템 타입 결정 (80% 과일, 20% 폭탄)
    const type = Math.random() > 0.2 ? 'fruit' : 'bomb';

    // 과일 종류 랜덤
    let item = '🍎';
    let score = 100;

    if (type === 'fruit') {
      const rand = Math.random();
      if (rand > 0.7) { item = '🍊'; score = 200; } // 오렌지
      else if (rand > 0.9) { item = '🍇'; score = 300; } // 포도
    } else {
      item = '💣';
      score = -500;
    }

    this.fallingObjects.push({
      lane: lane,
      x: lane * this.laneWidth + (this.laneWidth / 2), // 레인 중앙
      y: -30, // 화면 위에서 시작
      type: type,
      icon: item,
      scoreValue: score,
      speed: 100 + (this.level * 20) // 레벨 비례 속도 증가
    });
  }

  /**
   * 충돌 처리 (획득)
   */
  handleCollision(obj) {
    if (obj.type === 'bomb') {
      // 폭탄: 점수 깎이거나 게임 오버
      // this.lives--; // 라이프 감소 규칙을 원하면 주석 해제
      this.score = Math.max(0, this.score + obj.scoreValue); // 0점 미만 방지
      console.log("BOMB! Life lost!");
    } else {
      // 과일: 점수 획득
      this.score += obj.scoreValue;
    }

    this.checkLevelUp();
    this.notifyScoreChange();

    if (this.lives <= 0) {
      this.stop();
    }
  }

  /**
   * 놓침 처리
   */
  handleMiss(obj) {
    if (obj.type === 'fruit') {
      // 과일 놓치면 라이프 감소? (여기서는 그냥 점수만 유지할지 선택)
      // this.lives--; 
      console.log("Missed fruit...");
    }
    // 폭탄을 피해서 바닥에 닿은건 잘한 일! 점수 변동 없음.

    this.notifyScoreChange();
    if (this.lives <= 0) {
      this.stop();
    }
  }

  checkLevelUp() {
    // 1000점마다 레벨업
    const newLevel = Math.floor(this.score / 1000) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      // 난이도 조절: 생성 주기 단축
      this.spawnInterval = Math.max(500, 1500 - (this.level * 100));
      console.log(`Level Up! Current Level: ${this.level}`);
    }
  }

  /**
   * 게임 화면 그리기
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!this.isGameActive) return;

    // 1. 바구니 그리기
    const basketX = this.basketPosition * this.laneWidth + (this.laneWidth / 2);

    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🧺", basketX, this.basketY);

    // 디버그: 바구니 위치 영역 표시 (선택사항)
    // ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
    // ctx.fillRect(this.basketPosition * this.laneWidth, this.basketY - 20, this.laneWidth, 40);

    // 2. 떨어지는 물체 그리기
    for (const obj of this.fallingObjects) {
      ctx.font = "30px Arial";
      ctx.fillText(obj.icon, obj.x, obj.y);
    }

    // 3. UI 그리기 (점수, 레벨)
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${this.score}`, 10, 20);
    ctx.fillText(`Level: ${this.level}`, 10, 40);
  }

  setScoreChangeCallback(callback) {
    this.onScoreChange = callback;
  }

  setGameEndCallback(callback) {
    this.onGameEnd = callback;
  }

  notifyScoreChange() {
    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level, this.lives);
    }
  }
}

// 전역으로 내보내기
window.GameEngine = GameEngine;
