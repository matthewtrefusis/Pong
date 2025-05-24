class PongGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.gameMode = 'single'; // single, multi
        this.difficulty = 'medium';
        
        // Game objects
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            vx: 0,
            vy: 0,
            radius: 8,
            speed: 5,
            maxSpeed: 12,
            trail: []
        };
        
        this.paddle1 = {
            x: 20,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 6,
            score: 0
        };
        
        this.paddle2 = {
            x: this.canvas.width - 30,
            y: this.canvas.height / 2 - 50,
            width: 10,
            height: 100,
            speed: 6,
            score: 0,
            aiDifficulty: 0.8
        };
        
        // Input handling
        this.keys = {};
        this.winningScore = 5;
        
        // Particle effects
        this.particles = [];
        
        // Sound effects (visual feedback)
        this.screenShake = { intensity: 0, duration: 0 };
        
        this.initializeEventListeners();
        this.resetBall();
        this.gameLoop();
    }
    
    initializeEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space' || e.code === 'Escape') {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.pauseGame();
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Menu buttons
        document.getElementById('singlePlayerBtn').addEventListener('click', () => {
            this.startGame('single');
        });
        
        document.getElementById('multiPlayerBtn').addEventListener('click', () => {
            this.startGame('multi');
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.showMainMenu();
        });
        
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.updateDifficulty();
        });
    }
    
    startGame(mode) {
        this.gameMode = mode;
        this.gameState = 'playing';
        this.resetGame();
        this.hideOverlay();
    }
    
    pauseGame() {
        this.gameState = 'paused';
        this.showPauseMenu();
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.hideOverlay();
    }
    
    restartGame() {
        this.resetGame();
        this.gameState = 'playing';
        this.hideOverlay();
    }
    
    resetGame() {
        this.paddle1.score = 0;
        this.paddle2.score = 0;
        this.paddle1.y = this.canvas.height / 2 - 50;
        this.paddle2.y = this.canvas.height / 2 - 50;
        this.particles = [];
        this.resetBall();
        this.updateScore();
    }
    
    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        
        // Random direction
        const angle = (Math.random() - 0.5) * Math.PI / 3; // ±30 degrees
        const direction = Math.random() < 0.5 ? 1 : -1;
        
        this.ball.vx = Math.cos(angle) * this.ball.speed * direction;
        this.ball.vy = Math.sin(angle) * this.ball.speed;
        this.ball.trail = [];
    }
    
    updateDifficulty() {
        const difficulties = {
            easy: { aiSpeed: 0.6, ballSpeed: 4, paddleSpeed: 5 },
            medium: { aiSpeed: 0.8, ballSpeed: 5, paddleSpeed: 6 },
            hard: { aiSpeed: 1.0, ballSpeed: 6, paddleSpeed: 7 },
            insane: { aiSpeed: 1.2, ballSpeed: 8, paddleSpeed: 8 }
        };
        
        const config = difficulties[this.difficulty];
        this.paddle2.aiDifficulty = config.aiSpeed;
        this.ball.speed = config.ballSpeed;
        this.paddle1.speed = config.paddleSpeed;
        this.paddle2.speed = config.paddleSpeed;
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.updatePaddles();
        this.updateBall();
        this.updateParticles();
        this.updateScreenShake();
        this.checkCollisions();
        this.checkScore();
    }
    
    updatePaddles() {
        // Player 1 controls
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.paddle1.y = Math.max(0, this.paddle1.y - this.paddle1.speed);
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.paddle1.y = Math.min(this.canvas.height - this.paddle1.height, this.paddle1.y + this.paddle1.speed);
        }
        
        // Player 2 controls (or AI)
        if (this.gameMode === 'multi') {
            if (this.keys['ArrowUp']) {
                this.paddle2.y = Math.max(0, this.paddle2.y - this.paddle2.speed);
            }
            if (this.keys['ArrowDown']) {
                this.paddle2.y = Math.min(this.canvas.height - this.paddle2.height, this.paddle2.y + this.paddle2.speed);
            }
        } else {
            // AI logic
            const ballCenterY = this.ball.y;
            const paddleCenterY = this.paddle2.y + this.paddle2.height / 2;
            const distance = ballCenterY - paddleCenterY;
            
            if (Math.abs(distance) > 10) {
                const moveSpeed = this.paddle2.speed * this.paddle2.aiDifficulty;
                if (distance > 0) {
                    this.paddle2.y = Math.min(this.canvas.height - this.paddle2.height, this.paddle2.y + moveSpeed);
                } else {
                    this.paddle2.y = Math.max(0, this.paddle2.y - moveSpeed);
                }
            }
        }
    }
    
    updateBall() {
        // Add to trail
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
        if (this.ball.trail.length > 10) {
            this.ball.trail.shift();
        }
        
        // Update position
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;
        
        // Ball collision with top/bottom walls
        if (this.ball.y <= this.ball.radius || this.ball.y >= this.canvas.height - this.ball.radius) {
            this.ball.vy = -this.ball.vy;
            this.ball.y = Math.max(this.ball.radius, Math.min(this.canvas.height - this.ball.radius, this.ball.y));
            this.createParticles(this.ball.x, this.ball.y, '#00ff88');
            this.addScreenShake(3, 10);
        }
    }
    
    checkCollisions() {
        // Paddle 1 collision
        if (this.ball.x - this.ball.radius <= this.paddle1.x + this.paddle1.width &&
            this.ball.x + this.ball.radius >= this.paddle1.x &&
            this.ball.y >= this.paddle1.y &&
            this.ball.y <= this.paddle1.y + this.paddle1.height &&
            this.ball.vx < 0) {
            
            this.handlePaddleCollision(this.paddle1);
        }
        
        // Paddle 2 collision
        if (this.ball.x + this.ball.radius >= this.paddle2.x &&
            this.ball.x - this.ball.radius <= this.paddle2.x + this.paddle2.width &&
            this.ball.y >= this.paddle2.y &&
            this.ball.y <= this.paddle2.y + this.paddle2.height &&
            this.ball.vx > 0) {
            
            this.handlePaddleCollision(this.paddle2);
        }
    }
    
    handlePaddleCollision(paddle) {
        const relativeIntersectY = (this.ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
        const bounceAngle = relativeIntersectY * Math.PI / 4; // Max 45 degrees
        
        const speed = Math.min(this.ball.maxSpeed, Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy) + 0.5);
        
        if (paddle === this.paddle1) {
            this.ball.vx = speed * Math.cos(bounceAngle);
            this.ball.vy = speed * Math.sin(bounceAngle);
        } else {
            this.ball.vx = -speed * Math.cos(bounceAngle);
            this.ball.vy = speed * Math.sin(bounceAngle);
        }
        
        this.createParticles(this.ball.x, this.ball.y, '#00aaff');
        this.addScreenShake(5, 15);
    }
    
    checkScore() {
        if (this.ball.x < 0) {
            this.paddle2.score++;
            this.createParticles(50, this.canvas.height / 2, '#ff4444');
            this.addScreenShake(8, 20);
            this.resetBall();
            this.updateScore();
        } else if (this.ball.x > this.canvas.width) {
            this.paddle1.score++;
            this.createParticles(this.canvas.width - 50, this.canvas.height / 2, '#44ff44');
            this.addScreenShake(8, 20);
            this.resetBall();
            this.updateScore();
        }
        
        if (this.paddle1.score >= this.winningScore || this.paddle2.score >= this.winningScore) {
            this.gameOver();
        }
    }
    
    createParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                maxLife: 30,
                color: color
            });
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    addScreenShake(intensity, duration) {
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
    }
    
    updateScreenShake() {
        if (this.screenShake.duration > 0) {
            this.screenShake.duration--;
            if (this.screenShake.duration <= 0) {
                this.screenShake.intensity = 0;
            }
        }
    }
    
    render() {
        // Apply screen shake
        this.ctx.save();
        if (this.screenShake.intensity > 0) {
            const offsetX = (Math.random() - 0.5) * this.screenShake.intensity;
            const offsetY = (Math.random() - 0.5) * this.screenShake.intensity;
            this.ctx.translate(offsetX, offsetY);
        }
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw center line
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw paddles
        this.ctx.fillStyle = '#00ff88';
        this.ctx.shadowColor = '#00ff88';
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(this.paddle1.x, this.paddle1.y, this.paddle1.width, this.paddle1.height);
        this.ctx.fillRect(this.paddle2.x, this.paddle2.y, this.paddle2.width, this.paddle2.height);
        
        // Draw ball trail
        for (let i = 0; i < this.ball.trail.length; i++) {
            const trailBall = this.ball.trail[i];
            const alpha = (i + 1) / this.ball.trail.length * 0.5;
            this.ctx.fillStyle = `rgba(0, 170, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(trailBall.x, trailBall.y, this.ball.radius * alpha, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw ball
        this.ctx.fillStyle = '#00aaff';
        this.ctx.shadowColor = '#00aaff';
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw particles
        for (const particle of this.particles) {
            const alpha = particle.life / particle.maxLife;
            this.ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = particle.color;
            this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
        }
        
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }
    
    updateScore() {
        document.getElementById('player1Score').textContent = this.paddle1.score;
        document.getElementById('player2Score').textContent = this.paddle2.score;
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        const winner = this.paddle1.score >= this.winningScore ? 
            (this.gameMode === 'multi' ? 'Player 1' : 'You') : 
            (this.gameMode === 'multi' ? 'Player 2' : 'AI');
        
        document.getElementById('winnerText').textContent = `${winner} Win${winner.includes('You') ? '' : 's'}!`;
        this.showGameOverMenu();
    }
    
    showMainMenu() {
        this.gameState = 'menu';
        document.getElementById('gameOverlay').style.display = 'flex';
        document.getElementById('startMenu').style.display = 'block';
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('gameOverMenu').style.display = 'none';
    }
    
    showPauseMenu() {
        document.getElementById('gameOverlay').style.display = 'flex';
        document.getElementById('startMenu').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'block';
        document.getElementById('gameOverMenu').style.display = 'none';
    }
    
    showGameOverMenu() {
        document.getElementById('gameOverlay').style.display = 'flex';
        document.getElementById('startMenu').style.display = 'none';
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('gameOverMenu').style.display = 'block';
    }
    
    hideOverlay() {
        document.getElementById('gameOverlay').style.display = 'none';
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new PongGame();
});
