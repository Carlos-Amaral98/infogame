// Lista de Hardware (Botões clicáveis)
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

// Banco de problemas aleatórios dinâmicos
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

let score = 0;
let multiplier = 1;
let stability = 100;
let resolvedCount = 0;
let currentProblem = null;
let gameInterval = null;
let stabilityInterval = null;
let baseSpeed = 4000; // Tempo inicial por problema (ms)
let selectedDifficulty = "pleno"; // Armazena a escolha de carreira do aluno

// Inicializa a interface
document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("hardwareGrid");
    // Renderiza botões de hardware de forma fixa para criar memória muscular de clique
    components.forEach(comp => {
        const card = document.createElement("div");
        card.className = "hw-card";
        card.innerText = comp.name;
        card.onclick = () => handleAnswer(comp.key);
        grid.appendChild(card);
    });
    
    // Carrega o High Score do navegador local
    const savedHighScore = localStorage.getItem("hw_high_score") || 0;
    document.getElementById("high-score").innerText = savedHighScore;
});

function startGame() {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
    document.getElementById("alertMonitor").classList.add("active-alert");
    
    // Captura o nível de carreira escolhido pelo aluno
    selectedDifficulty = document.getElementById("difficultySelect").value;
    
    // Configura a velocidade de reação com base no nível profissional
    if (selectedDifficulty === "junior") {
        baseSpeed = 6500; // 6.5 segundos para responder
    } else if (selectedDifficulty === "pleno") {
        baseSpeed = 4500; // 4.5 segundos para responder
    } else if (selectedDifficulty === "senior") {
        baseSpeed = 2500; // 2.5 segundos (Tempo curto para quem tem experiência)
    }

    nextProblem();
    
    // Loop de perda contínua de estabilidade caso haja problemas na tela
    stabilityInterval = setInterval(() => {
        if (currentProblem) {
            // A perda de vida drena mais devagar no Júnior e derrete no Sênior
            if (selectedDifficulty === "junior") {
                stability -= 1 + Math.floor(resolvedCount / 7);
            } else if (selectedDifficulty === "pleno") {
                stability -= 2 + Math.floor(resolvedCount / 4);
            } else if (selectedDifficulty === "senior") {
                stability -= 4 + Math.floor(resolvedCount / 2);
            }

            if (stability < 0) stability = 0;
            updateStabilityUI();
            
            if (stability <= 0) {
                gameOver();
            }
        }
    }, 150);
}

function nextProblem() {
    if (stability <= 0) return;
    
    // Escolhe um problema aleatório
    const randIndex = Math.floor(Math.random() * problems.length);
    currentProblem = problems[randIndex];
    document.getElementById("current-problem").innerText = currentProblem.text;
    
    // Define a aceleração e o limite máximo de velocidade de acordo com o nível
    let speed;
    if (selectedDifficulty === "junior") {
        speed = Math.max(2200, baseSpeed - (resolvedCount * 80)); // Ritmo brando, trava o teto em 2.2s
    } else if (selectedDifficulty === "pleno") {
        speed = Math.max(1500, baseSpeed - (resolvedCount * 150)); // Ritmo médio padrão equilibrado
    } else if (selectedDifficulty === "senior") {
        speed = Math.max(800, baseSpeed - (resolvedCount * 250)); // Ritmo agressivo, trava o teto em 0.8s
    }
    
    // Agenda o próximo problema caso o aluno ignore este
    clearTimeout(gameInterval);
    gameInterval = setTimeout(() => {
        nextProblem();
    }, speed);
}

function handleAnswer(selectedKey) {
    if (!currentProblem || stability <= 0) return;

    if (selectedKey === currentProblem.correct) {
        // Acertou
        resolvedCount++;
        score += 10 * multiplier;
        if (resolvedCount % 3 === 0) multiplier++; // Aumenta multiplicador a cada 3 acertos
        
        // Recupera um pouco de vida/estabilidade
        stability = Math.min(100, stability + 15);
        
        document.getElementById("score").innerText = score;
        document.getElementById("multiplier").innerText = `x${multiplier}`;
        updateStabilityUI();
        
        // Avança imediatamente
        nextProblem();
    } else {
        // Errou (Penalidade drástica de estabilidade para evitar cliques aleatórios)
        stability = Math.max(0, stability - 20);
        multiplier = 1; // Reseta o combo multiplicador
        document.getElementById("multiplier").innerText = `x${multiplier}`;
        updateStabilityUI();
        
        if (stability <= 0) gameOver();
    }
}

function updateStabilityUI() {
    const bar = document.getElementById("stabilityBar");
    document.getElementById("stability-val").innerText = `${stability}%`;
    bar.style.width = `${stability}%`;
    
    if (stability > 50) {
        bar.style.background = "linear-gradient(90deg, #39ff14, #00ff88)";
    } else if (stability > 25) {
        bar.style.background = "#ffaa00";
    } else {
        bar.style.background = "#ff3131";
    }
}

function gameOver() {
    clearInterval(stabilityInterval);
    clearTimeout(gameInterval);
    currentProblem = null;
    
    // Verifica e salva Novo Recorde
    const currentHighScore = parseInt(localStorage.getItem("hw_high_score") || 0);
    if (score > currentHighScore) {
        localStorage.setItem("hw_high_score", score);
    }
    
    // Gera código de verificação criptográfico simples (evita fraude de pontuação na sala)
    const salt = (score * 7) + 404;
    const cryptoCode = `HW-${salt}-EXP`;
    
    // Mostra Tela Azul de Fim de Jogo
    document.getElementById("final-score").innerText = score;
    document.getElementById("final-resolved").innerText = resolvedCount;
    document.getElementById("auth-code").innerText = cryptoCode;
    document.getElementById("bsodScreen").style.display = "block";
}
