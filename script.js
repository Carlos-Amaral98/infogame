// ---------- Dados do jogo ----------
const components = [
    { name: "🧠 Processador (CPU)", key: "cpu" },
    { name: "⚡ Memória RAM", key: "ram" },
    { name: "🗄️ Armazenamento SSD", key: "ssd" },
    { name: "🧱 Placa-Mãe", key: "motherboard" },
    { name: "🔌 Fonte de Alimentação", key: "power" },
    { name: "🎮 Placa de Vídeo (GPU)", key: "gpu" },
    { name: "❄️ Cooler do Processador", key: "cooler" },
    { name: "🔋 Bateria CMOS", key: "cmos" }
];

const problems = [
    { text: "🔥 O computador superaqueceu e vai desligar em segundos!", correct: "cooler" },
    { text: "⏳ O jogo travou totalmente por falta de memória volátil aberta!", correct: "ram" },
    { text: "💥 A tela congelou em 3D no meio da renderização dos gráficos!", correct: "gpu" },
    { text: "🔋 O relógio do Windows desconfigura e reseta toda vez que desliga!", correct: "cmos" },
    { text: "🔌 O computador desligou sozinho ao abrir um software muito pesado!", correct: "power" },
    { text: "📂 Erro de leitura cíclica: Falha ao carregar os arquivos do Windows!", correct: "ssd" },
    { text: "🧠 Pane Geral: As instruções matemáticas básicas falharam no núcleo 0!", correct: "cpu" },
    { text: "🛑 Falha no barramento central: Os componentes pararam de se comunicar!", correct: "motherboard" }
];

// Bônus especiais: qualquer clique/tecla resolve
const powerUps = [
    { text: "⏸️ BÔNUS: clique em QUALQUER componente para CONGELAR o sistema por 3s!", type: "freeze" },
    { text: "🛡️ BÔNUS: clique em QUALQUER componente para ganhar um ESCUDO (ignora o próximo erro)!", type: "shield" },
    { text: "✨ BÔNUS: clique em QUALQUER componente para PONTOS EM DOBRO na próxima resposta!", type: "double" }
];

// Teclas 1-8 usadas pelo Jogador 2 no modo Duelo
const keyMap = ["1", "2", "3", "4", "5", "6", "7", "8"];

// ---------- Estado geral ----------
let mode = "solo"; // "solo" | "duel"
let selectedDifficulty = "pleno";
let baseSpeed = 4000;
let gameInterval = null;
let stabilityInterval = null;
let currentProblem = null;
let currentOrder = [...components]; // ordem exibida no grid (embaralhada a cada rodada)

// ---------- Estado Solo ----------
let score = 0;
let multiplier = 1;
let stability = 100;
let resolvedCount = 0;
let streak = 0;
let shieldActive = false;
let doubleActive = false;

// ---------- Estado Duelo ----------
let p1Score = 0, p2Score = 0;
let p1Stability = 100, p2Stability = 100;
let p1Shield = false, p2Shield = false;
let p1Double = false, p2Double = false;

// ---------- Inicialização ----------
document.addEventListener("DOMContentLoaded", () => {
    renderGrid();

    const savedHighScore = localStorage.getItem("hw_high_score") || 0;
    document.getElementById("high-score").innerText = savedHighScore;

    document.getElementById("modeSelect").addEventListener("change", (e) => {
        document.getElementById("duelInfo").style.display =
            e.target.value === "duel" ? "block" : "none";
    });

    document.addEventListener("keydown", handleKeyPress);
});

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function renderGrid() {
    const grid = document.getElementById("hardwareGrid");
    grid.innerHTML = "";
    currentOrder.forEach((comp, index) => {
        const card = document.createElement("div");
        card.className = "hw-card";
        card.innerHTML = mode === "duel"
            ? `<span class="key-badge">${keyMap[index]}</span>${comp.name}`
            : comp.name;
        card.onclick = () => handleAnswer(comp.key, "mouse");
        grid.appendChild(card);
    });
}

// ---------- Início do jogo ----------
function startGame() {
    mode = document.getElementById("modeSelect").value;
    selectedDifficulty = document.getElementById("difficultySelect").value;

    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
    document.getElementById("alertMonitor").classList.add("active-alert");

    if (selectedDifficulty === "junior") baseSpeed = 6500;
    else if (selectedDifficulty === "pleno") baseSpeed = 4500;
    else baseSpeed = 2500;

    const isDuel = mode === "duel";
    document.getElementById("soloHud").style.display = isDuel ? "none" : "grid";
    document.getElementById("duelHud").style.display = isDuel ? "grid" : "none";
    document.getElementById("soloStabilitySection").style.display = isDuel ? "none" : "block";
    document.getElementById("duelStabilitySection").style.display = isDuel ? "flex" : "none";
    document.getElementById("duelInstructions").style.display = isDuel ? "block" : "none";

    currentOrder = shuffle(components);
    renderGrid();
    nextProblem();

    stabilityInterval = setInterval(tickStability, 150);
}

function tickStability() {
    if (!currentProblem) return; // pausado durante bônus de congelamento

    let drain = 2 + Math.floor(resolvedCount / 4);
    if (selectedDifficulty === "junior") drain = 1 + Math.floor(resolvedCount / 7);
    if (selectedDifficulty === "senior") drain = 4 + Math.floor(resolvedCount / 2);

    if (mode === "solo") {
        stability = Math.max(0, stability - drain);
        updateSoloUI();
        if (stability <= 0) gameOver();
    } else {
        p1Stability = Math.max(0, p1Stability - drain);
        p2Stability = Math.max(0, p2Stability - drain);
        updateDuelUI();
        if (p1Stability <= 0 || p2Stability <= 0) duelOver();
    }
}

// ---------- Fluxo de problemas ----------
function nextProblem() {
    if (mode === "solo" && stability <= 0) return;
    if (mode === "duel" && (p1Stability <= 0 || p2Stability <= 0)) return;

    const alertBox = document.getElementById("alertMonitor");
    const isPowerUpRound = resolvedCount > 0 && resolvedCount % 5 === 0 && Math.random() < 0.6;

    if (isPowerUpRound) {
        currentProblem = { ...powerUps[Math.floor(Math.random() * powerUps.length)], isPowerUp: true };
        alertBox.classList.add("powerup-alert");
    } else {
        currentProblem = problems[Math.floor(Math.random() * problems.length)];
        alertBox.classList.remove("powerup-alert");
    }

    const problemEl = document.getElementById("current-problem");
    problemEl.innerText = currentProblem.text;
    problemEl.classList.remove("fade-in-problem");
    void problemEl.offsetWidth; // força reflow para reiniciar a animação
    problemEl.classList.add("fade-in-problem");

    currentOrder = shuffle(components);
    renderGrid();

    let speed;
    if (selectedDifficulty === "junior") speed = Math.max(2200, baseSpeed - (resolvedCount * 80));
    else if (selectedDifficulty === "pleno") speed = Math.max(1500, baseSpeed - (resolvedCount * 150));
    else speed = Math.max(800, baseSpeed - (resolvedCount * 250));

    clearTimeout(gameInterval);
    gameInterval = setTimeout(nextProblem, speed);
}

// ---------- Entrada por teclado (Jogador 2 no Duelo) ----------
function handleKeyPress(e) {
    if (mode !== "duel" || !currentProblem) return;
    const index = keyMap.indexOf(e.key);
    if (index === -1 || !currentOrder[index]) return;
    handleAnswer(currentOrder[index].key, "keyboard");
}

// ---------- Resposta ----------
function handleAnswer(selectedKey, source) {
    if (!currentProblem) return;

    if (mode === "solo") {
        handleSoloAnswer(selectedKey);
    } else {
        handleDuelAnswer(selectedKey, source);
    }
}

function handleSoloAnswer(selectedKey) {
    if (stability <= 0) return;

    if (currentProblem.isPowerUp) {
        resolvePowerUp("solo");
        return;
    }

    if (selectedKey === currentProblem.correct) {
        resolvedCount++;
        streak++;
        let gained = 10 * multiplier;
        if (doubleActive) { gained *= 2; doubleActive = false; }
        score += gained;
        if (resolvedCount % 3 === 0) multiplier++;
        stability = Math.min(100, stability + 15);
        showStreak();
        updateSoloUI();
        nextProblem();
    } else {
        if (shieldActive) {
            shieldActive = false;
        } else {
            stability = Math.max(0, stability - 20);
            multiplier = 1;
            streak = 0;
            triggerShake();
        }
        updateSoloUI();
        if (stability <= 0) gameOver();
    }
}

function handleDuelAnswer(selectedKey, source) {
    const isP1 = source === "mouse";

    if (currentProblem.isPowerUp) {
        resolvePowerUp(isP1 ? "p1" : "p2");
        return;
    }

    if (selectedKey === currentProblem.correct) {
        // Quem acerta primeiro marca ponto e ataca a estabilidade do rival
        let gained = 10;
        if (isP1 && p1Double) { gained *= 2; p1Double = false; }
        if (!isP1 && p2Double) { gained *= 2; p2Double = false; }

        if (isP1) {
            p1Score += gained;
            p2Stability = Math.max(0, p2Stability - 10);
        } else {
            p2Score += gained;
            p1Stability = Math.max(0, p1Stability - 10);
        }
        resolvedCount++;
        updateDuelUI();
        nextProblem();
        if (p1Stability <= 0 || p2Stability <= 0) duelOver();
    } else {
        if (isP1) {
            if (p1Shield) p1Shield = false;
            else { p1Stability = Math.max(0, p1Stability - 15); triggerShake(); }
        } else {
            if (p2Shield) p2Shield = false;
            else { p2Stability = Math.max(0, p2Stability - 15); triggerShake(); }
        }
        updateDuelUI();
        if (p1Stability <= 0 || p2Stability <= 0) duelOver();
    }
}

function resolvePowerUp(who) {
    const type = currentProblem.type;
    currentProblem = null; // pausa o dreno de estabilidade durante o bônus

    if (type === "freeze") {
        document.getElementById("current-problem").innerText = "⏸️ Sistema congelado por 3 segundos...";
        clearTimeout(gameInterval);
        gameInterval = setTimeout(nextProblem, 3000);
        return;
    }

    if (type === "shield") {
        if (who === "solo") shieldActive = true;
        if (who === "p1") p1Shield = true;
        if (who === "p2") p2Shield = true;
    }
    if (type === "double") {
        if (who === "solo") doubleActive = true;
        if (who === "p1") p1Double = true;
        if (who === "p2") p2Double = true;
    }

    nextProblem();
}

// ---------- Feedback visual ----------
function triggerShake() {
    const box = document.getElementById("alertMonitor");
    box.classList.remove("shake");
    void box.offsetWidth;
    box.classList.add("shake");
}

function showStreak() {
    const el = document.getElementById("streakDisplay");
    if (streak >= 2) {
        el.innerText = `🔥 ${streak} seguidos!`;
        el.style.display = "inline-block";
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
    } else {
        el.style.display = "none";
    }
}

function stabilityColor(value) {
    if (value > 50) return "linear-gradient(90deg, #16a34a, #22c55e)";
    if (value > 25) return "#f59e0b";
    return "#dc2626";
}

function updateSoloUI() {
    document.getElementById("score").innerText = score;
    document.getElementById("multiplier").innerText = `x${multiplier}`;
    document.getElementById("stability-val").innerText = `${stability}%`;
    const bar = document.getElementById("stabilityBar");
    bar.style.width = `${stability}%`;
    bar.style.background = stabilityColor(stability);
}

function updateDuelUI() {
    document.getElementById("p1-score").innerText = p1Score;
    document.getElementById("p2-score").innerText = p2Score;
    document.getElementById("p1-stability-val").innerText = `${p1Stability}%`;
    document.getElementById("p2-stability-val").innerText = `${p2Stability}%`;

    const bar1 = document.getElementById("p1StabilityBar");
    const bar2 = document.getElementById("p2StabilityBar");
    bar1.style.width = `${p1Stability}%`;
    bar2.style.width = `${p2Stability}%`;
    bar1.style.background = stabilityColor(p1Stability);
    bar2.style.background = stabilityColor(p2Stability);
}

// ---------- Fim de jogo ----------
function gameOver() {
    clearInterval(stabilityInterval);
    clearTimeout(gameInterval);
    currentProblem = null;

    const currentHighScore = parseInt(localStorage.getItem("hw_high_score") || 0);
    if (score > currentHighScore) localStorage.setItem("hw_high_score", score);

    document.getElementById("bsod-title").innerText = "Ocorreu um problema e o seu PC precisou ser reiniciado.";
    document.getElementById("result-label-1").innerText = "Pontuação Final:";
    document.getElementById("result-label-2").innerText = "Problemas Resolvidos:";
    document.getElementById("final-score").innerText = score;
    document.getElementById("final-resolved").innerText = resolvedCount;
    document.getElementById("bsodScreen").style.display = "block";
}

function duelOver() {
    clearInterval(stabilityInterval);
    clearTimeout(gameInterval);
    currentProblem = null;

    let winnerText;
    if (p1Stability <= 0 && p2Stability <= 0) winnerText = "Empate! Os dois sistemas colapsaram.";
    else if (p1Stability <= 0) winnerText = "⌨️ Jogador 2 venceu o duelo!";
    else winnerText = "🖱️ Jogador 1 venceu o duelo!";

    document.getElementById("bsod-title").innerText = winnerText;
    document.getElementById("result-label-1").innerText = "Placar (P1 x P2):";
    document.getElementById("result-label-2").innerText = "Resultado:";
    document.getElementById("final-score").innerText = `${p1Score} x ${p2Score}`;
    document.getElementById("final-resolved").innerText = winnerText;
    document.getElementById("bsodScreen").style.display = "block";
}
