// Required modules
import * as THREE from "../lib/three.module.js";
import { TWEEN } from "../lib/tween.module.min.js";
import { OrbitControls } from "../lib/OrbitControls.module.js";

// Global variables
let renderer, scene, camera;
let cube;
let rotationTween = null;

let selectedPiece = null;
let selectedPiecePosition = null;
let isFirstSelection = true;
let isWhiteTurn = true;
let gameStarted = false;
const whiteKnockedOut = [];
const blackKnockedOut = [];
let squares = [];
const boardState = Array.from({ length: 8 }, () => Array(8).fill(null));

// Initialize
init();
loadScene();
createStartScreen();
render();

function init() {
    // Render Engine
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xBBABA2);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
    camera.position.set(25, 10, 35); // Adjust the Z position to move the camera further out
    const cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 1, 0);
    camera.lookAt(0, 1, 0);

    // Event Listener
    renderer.domElement.addEventListener('click', onPieceMove);
}

function loadScene() {

    const roomSize = 20;
    const wallHeight = 20;
    const squareSize = 1;
    const boardThickness = 0.2;
    const boardSize = 8;
    const materialWhite = new THREE.MeshStandardMaterial({ color: 0xE6C6B1, metalness: 0.2, roughness: 0.2 });
    const materialBlack = new THREE.MeshStandardMaterial({ color: 0x012642, metalness: 0.2, roughness: 0.2 });

    // Create chess board
    for (let i = 0; i < boardSize; i++) {
        squares[i] = [];
        for (let j = 0; j < boardSize; j++) {
            const material = (i + j) % 2 === 0 ? materialBlack : materialWhite;

            const square = new THREE.Mesh(new THREE.BoxGeometry(squareSize, boardThickness, squareSize), material);
            square.position.set(i - boardSize / 2 + 0.5, boardThickness, j - boardSize / 2 + 0.5);
            square.castShadow = true;
            square.receiveShadow = true;

            scene.add(square);
            squares[i][j] = square;
        }
    }

    // Add pieces to the board
    addChessPieces('white', 0);
    addChessPieces('black', 7);

    // Create cube
    const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x121610, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;

    const ceilingGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x121610, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.1 });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight - 2;

    const wallGeometry = new THREE.BoxGeometry(roomSize, wallHeight, 0.1);

    // Texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('images/chess.png');
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.4,
        map: texture,
    });

    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -roomSize / 2;
    backWall.position.y = wallHeight / 2 - 2;

    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.z = roomSize / 2;
    frontWall.position.y = wallHeight / 2 - 2;

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.x = -roomSize / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.y = wallHeight / 2 - 2;

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.x = roomSize / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.y = wallHeight / 2 - 2;
    //scene.add(rightWall);

    cube = new THREE.Object3D();
    cube.add(floor);
    cube.add(ceiling);
    cube.add(backWall);
    cube.add(frontWall);
    cube.add(leftWall);
    cube.add(rightWall);

    scene.add(cube);
    animateCube();
  
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Lights
    const lights = [];
    for (let i = 0; i < 10; i++) {
        const light = new THREE.PointLight(getRandomColor(), 1, 10, 2);
        light.position.set(getRandomPosition(-5, 5), getRandomPosition(1, 3), getRandomPosition(-5, 5));
        scene.add(light);
        lights.push(light);
    }
    function getRandomColor() {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    function getRandomPosition(min, max) {
        return Math.random() * (max - min) + min;
    }
}

// Animate the cube
function animateCube() {
  const rotationAmount = Math.PI / 3;
  rotationTween = new TWEEN.Tween(cube.rotation)
      .to({ y: cube.rotation.y + rotationAmount }, 2000) 
      .easing(TWEEN.Easing.Linear.None) 
      .onComplete(() => animateCube())
      .start();
}

// Stop cube animation
function stopAnimation() {
  if (rotationTween) {
      rotationTween.stop();
  }
}

function addChessPieces(color, row) {
  const pieceTypes = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  pieceTypes.forEach((type, col) => {
      boardState[row][col] = createChessPiece(type, color, row, col, 'images/metal_128.jpg');
  });
  for (let col = 0; col < 8; col++) {
      boardState[row + (color === 'white' ? 1 : -1)][col] = createChessPiece('pawn', color, row + (color === 'white' ? 1 : -1), col, 'images/metal_128.jpg');
  }
}


function createChessPiece(type, color, x, z, texturePath) {
  let pieceGeometry;
  let pieceHeight = 0;

  switch (type) {
    case 'pawn':
        pieceGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.3, 32);
        pieceHeight = 0.3 + 0.2;
        break;
    case 'rook':
        pieceGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.4);
        pieceHeight = 0.8 + 0.2;
        break;
    case 'knight':
        pieceGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.3);
        pieceHeight = 0.5 + 0.2;
        break;
    case 'bishop':
        pieceGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        pieceHeight = 0.7 + 0.2;
        break;
    case 'queen':
        pieceGeometry = new THREE.BoxGeometry(0.5, 0.9, 0.5);
        pieceHeight = 0.9 + 0.2;
        break;
    case 'king':
        pieceGeometry = new THREE.BoxGeometry(0.6, 1, 0.6); 
        pieceHeight = 1 + 0.2;
        break;
    default:
        pieceGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
        pieceHeight = 0.1 + 0.2;
        break;
  }

  // Texture
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(texturePath);

  const pieceMaterial = new THREE.MeshStandardMaterial({ 
      color: color === 'white' ? 0xAA8971 : 0x121610,
      map: texture
  });

  const piece = new THREE.Mesh(pieceGeometry, pieceMaterial);
  piece.castShadow = true;
  piece.receiveShadow = true;

  // Set position
  piece.position.x = x - 4 + 0.5;
  piece.position.y = squares[0][0].position.y + pieceHeight / 2;
  piece.position.z = z - 4 + 0.5;
  scene.add(piece);

  piece.name = `${type} ${color}`;

  return piece;
}


function createTextField(id, label, style) {
  const textField = document.createElement("div");
  textField.id = id;
  textField.style.cssText = `position: absolute; color: white; font-family: Arial, sans-serif; font-size: 10px; font-weight: bold; text-shadow: 1px 1px 2px black; padding: 10px; background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5); pointer-events: none; ${style}`;
  textField.innerHTML = `${label}: <span></span>`;
  return textField;
}

function onPieceMove(event) {
  if (!gameStarted) return;
  
  const colorToSelect = isWhiteTurn ? 'white' : 'black';
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2((event.clientX / renderer.domElement.clientWidth) * 2 - 1, -(event.clientY / renderer.domElement.clientHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      
      if (isFirstSelection) {
          if (selectedObject.name.includes(colorToSelect)) {
              isFirstSelection = false;
              selectedPiecePosition = selectedObject.position.clone();
              
              if (selectedPiece) selectedPiece.material.emissive.setHex(0x000000);
              selectedPiece = selectedObject;
              selectedPiece.material.emissive.setRGB(0, 0, 1);
          } else resetSelection();
      } else {
          const newPosition = selectedObject.position.clone();
          newPosition.y = selectedPiece.position.y;
          const isValidMove = validateMove(selectedPiecePosition, newPosition, selectedPiece.name.split(" ")[0], selectedPiece.name.split(" ")[1]);
          
          if (isValidMove) {
              selectedPiece.position.copy(newPosition);
              removePiece(newPosition);
              const oldPos = getPositionOnBoard(selectedPiecePosition);
              const newPos = getPositionOnBoard(newPosition);
              [boardState[newPos.row][newPos.col], boardState[oldPos.row][oldPos.col]] = [boardState[oldPos.row][oldPos.col], null];
              resetSelection();
              isWhiteTurn = !isWhiteTurn;
              updateTurnText();
          } else resetSelection();
      }
  } else resetSelection();
}

function isKingCaptured(color) {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = boardState[i][j];
            if (piece && piece.name === 'king ' + color) {
                return false;
            }
        }
    }
    return true;
}

function validateMove(currentPosition, newPosition, pieceType, color) {
    const deltaX = newPosition.x - currentPosition.x;
    const deltaZ = newPosition.z - currentPosition.z;

    const currentPos = getPositionOnBoard(currentPosition);
    const newPos = getPositionOnBoard(newPosition);

    const currentRow = currentPos.row;
    const currentCol = currentPos.col;
    const newRow = newPos.row;
    const newCol = newPos.col;

    if (boardState[newRow][newCol] && boardState[newRow][newCol].name.includes(color)) {
        return false;
    }

    switch (pieceType) {
        case 'pawn':
            if (color === 'white') {
                if (currentPosition.z === newPosition.z && ((deltaZ === 0 && deltaX === 1) || (deltaX === 2 && currentPosition.x === 1 - 4 + 0.5))) {
                    for (let i = currentRow + 1; i < newRow + 1; i++) {
                        if (boardState[i][currentCol] !== null) {
                            return false;
                        }
                    }
                    return true;
                } else if (Math.abs(deltaZ) === 1 && deltaX === 1) {
                    if (boardState[newRow][newCol] && !boardState[newRow][newCol].name.includes(color)) {
                        return true;
                    }
                }
            } else {
                if (currentPosition.z === newPosition.z && (deltaZ === 0 && (deltaX === -1) || (deltaX === -2 && currentPosition.x === 6 - 4 + 0.5))) {
                    for (let i = currentRow - 1; i > newRow - 1; i--) {
                        if (boardState[i][currentCol] !== null) {
                            return false;
                        }
                    }
                    return true;
                } else if (Math.abs(deltaZ) === 1 && deltaX === -1) {
                    if (boardState[newRow][newCol] && !boardState[newRow][newCol].name.includes(color)) {
                        return true;
                    }
                }
            }
            break;
        case 'rook':
            if (currentPosition.z === newPosition.z || currentPosition.x === newPosition.x) {
                if (currentRow === newRow) {
                    const step = Math.sign(newCol - currentCol);
                    for (let j = currentCol + step; j !== newCol; j += step) {
                        if (boardState[currentRow][j] !== null) {
                            return false;
                        }
                    }
                } else if (currentCol === newCol) {
                    const step = Math.sign(newRow - currentRow);
                    for (let i = currentRow + step; i !== newRow; i += step) {
                        if (boardState[i][currentCol] !== null) {
                            return false;
                        }
                    }
                }
                return true;
            }
            break;
        case 'knight':
            if ((Math.abs(deltaX) === 1 && Math.abs(deltaZ) === 2) || (Math.abs(deltaX) === 2 && Math.abs(deltaZ) === 1)) {
                return true;
            }
            break;
        case 'bishop':
            if (Math.abs(deltaX) === Math.abs(deltaZ)) {
                const stepX = Math.sign(deltaX);
                const stepZ = Math.sign(deltaZ);
                let i = currentRow + stepX;
                let j = currentCol + stepZ;
                while (i !== newRow && j !== newCol) {
                    if (boardState[i][j] !== null) {
                        return false;
                    }
                    i += stepX;
                    j += stepZ;
                }
                return true;
            }
            break;
        case 'queen':
            if ((currentPosition.z === newPosition.z || currentPosition.x === newPosition.x) ||
                (Math.abs(deltaX) === Math.abs(deltaZ))) {
                if (currentRow === newRow) {
                    const step = Math.sign(newCol - currentCol);
                    for (let j = currentCol + step; j !== newCol; j += step) {
                        if (boardState[currentRow][j] !== null) {
                            return false;
                        }
                    }
                } else if (currentCol === newCol) {
                    const step = Math.sign(newRow - currentRow);
                    for (let i = currentRow + step; i !== newRow; i += step) {
                        if (boardState[i][currentCol] !== null) {
                            return false;
                        }
                    }
                } else if (Math.abs(deltaX) === Math.abs(deltaZ)) {
                    const stepX = Math.sign(deltaX);
                    const stepZ = Math.sign(deltaZ);
                    let i = currentRow + stepX;
                    let j = currentCol + stepZ;
                    while (i !== newRow && j !== newCol) {
                        if (boardState[i][j] !== null) {
                            return false;
                        }
                        i += stepX;
                        j += stepZ;
                    }
                }
                return true;
            }
            break;
        case 'king':
            if (Math.abs(deltaX) <= 1 && Math.abs(deltaZ) <= 1) {
                return true;
            }
            break;
        default:
            break;
    }
    return false;
}

function getPositionOnBoard(position) {
    const row = Math.round(position.x + 4 - 0.5);
    const col = Math.round(position.z + 4 - 0.5);
    return { row, col };
}

function removePiece(position) {
  const { row, col } = getPositionOnBoard(position);
  const pieceToRemove = boardState[row][col];
  if (pieceToRemove) {
      // Remove the piece from the scene
      scene.remove(pieceToRemove);

      // Update the knocked out pieces list
      if (pieceToRemove.name.includes('white')) {
          whiteKnockedOut.push(pieceToRemove.name.split(" ")[0]);
          document.getElementById("whiteKnockedOut").getElementsByTagName("span")[0].textContent = whiteKnockedOut.join(", ");
      } else {
          blackKnockedOut.push(pieceToRemove.name.split(" ")[0]);
          document.getElementById("blackKnockedOut").getElementsByTagName("span")[0].textContent = blackKnockedOut.join(", ");
      }
  }
}

function updateTurnText() {
  document.getElementById("turn").innerHTML = `${isWhiteTurn ? 'White' : 'Black'}'s Turn`;
}

function createStartScreen() {
  const startScreen = document.createElement("div");
  startScreen.id = "startScreen";
  startScreen.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; text-align: center; background-color: rgba(0, 0, 0, 0.75); padding: 20px; border-radius: 10px; box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.5); cursor: pointer; background-color: #012642;"; //#007bff
  startScreen.innerHTML = "<p>    START NEW GAME!    </p>";
  document.body.appendChild(startScreen);

  startScreen.addEventListener('click', () => {
      

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
      camera.position.set(0.5, 2, 7);
      const cameraControls = new OrbitControls(camera, renderer.domElement);
      cameraControls.target.set(0, 1, 0);
      camera.lookAt(0, 1, 0);

      // Adjust camera position
      camera.position.set(0.5, 8, 8);
      cameraControls.target.set(0, 1, 0);
      camera.lookAt(0, 1, 0);

      gameStarted = true;
      document.body.removeChild(startScreen);
      resetGame();
      resetSelection();
      stopAnimation();
  });
}

// Clear the board state
function resetGame() {
  for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
          if (boardState[i][j]) {
              scene.remove(boardState[i][j]);
              boardState[i][j] = null;
          }
      }
  }

  // Reset global variables
  selectedPiece = null;
  selectedPiecePosition = null;
  isFirstSelection = true;
  isWhiteTurn = true;
  whiteKnockedOut.length = 0;
  blackKnockedOut.length = 0;

  // Add pieces to the board
  addChessPieces('white', 0);
  addChessPieces('black', 7);
}

function resetSelection() {
    isFirstSelection = true;

    if (selectedPiece) {
        selectedPiece.material.emissive.setHex(0x000000);
        selectedPiece = null;
    }

    selectedPiecePosition = null;
    
    if (isKingCaptured(isWhiteTurn ? 'black' : 'white')) {
        gameStarted = false;
        resetGame();
        createStartScreen();
    }
}

function render() {
    requestAnimationFrame(render);
    TWEEN.update();
    renderer.render(scene, camera);
    
    // Add End Game button
    if (gameStarted && !document.getElementById("endGameButton")) {
        createEndGameButton();
    } else if (!gameStarted && document.getElementById("endGameButton")) {
        const endGameButton = document.getElementById("endGameButton");
        endGameButton.parentNode.removeChild(endGameButton);
    }

    if (gameStarted && !document.getElementById("turn")) {
        document.body.appendChild(createTextField("turn", "", "position: absolute; top: 20px; left: calc(50% - 100px); font-size: 24px;"));
        document.body.appendChild(createTextField("whiteKnockedOut", "White Knocked Out", "position: absolute; bottom: 20px; left: 20px; font-size: 18px;"));
        document.body.appendChild(createTextField("blackKnockedOut", "Black Knocked Out", "position: absolute; bottom: 20px; right: 20px; font-size: 18px;"));
        isWhiteTurn = true;
        updateTurnText();
      } else if (!gameStarted && document.getElementById("turn")) {
        document.body.removeChild(document.getElementById("turn"));
        document.body.removeChild(document.getElementById("whiteKnockedOut"));
        document.body.removeChild(document.getElementById("blackKnockedOut"));
    }
}

function endGame() {
  gameStarted = false;
  resetGame();
  createStartScreen();

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100);
  camera.position.set(25, 10, 35); // Adjust the Z position to move the camera further out
  const cameraControls = new OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 1, 0);
  camera.lookAt(0, 1, 0);

  // Call animateCube
  animateCube();
}

function styleEndGameButton(button) {
  button.style.position = "absolute";
  button.style.top = "20px";
  button.style.right = "20px";
  button.style.padding = "10px 20px";
  button.style.fontSize = "16px";
  button.style.fontWeight = "bold";
  button.style.backgroundColor = "#FF6347";
  button.style.color = "#FFFFFF";
  button.style.border = "none";
  button.style.borderRadius = "5px";
  button.style.cursor = "pointer";
  button.style.transition = "background-color 0.3s";
}

function createEndGameButton() {
  const endGameButton = document.createElement("button");
  endGameButton.id = "endGameButton";
  endGameButton.textContent = "End Game";
  styleEndGameButton(endGameButton);

  endGameButton.addEventListener("mouseenter", () => {
      endGameButton.style.backgroundColor = "#D32F2F";
  });

  endGameButton.addEventListener("mouseleave", () => {
      endGameButton.style.backgroundColor = "#FF6347";
  });

  endGameButton.addEventListener("click", endGame);

  document.body.appendChild(endGameButton);
}
