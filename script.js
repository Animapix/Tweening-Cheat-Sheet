let activeLanguage = 'pseudo';

document.addEventListener('DOMContentLoaded', init);

function init() {
    fetch("tweens.json")
        .then(response => response.json())
        .then(tweens => {
            const groupsContainer = document.querySelector('.tween-grid');

            tweens.forEach(tween => {
                const card = document.createElement("div");
                card.classList.add("group-card");

                // Préparer les données de code sous forme de JSON pour dataset
                const codeData = JSON.stringify(tween.code);

                // Remplir initialement le bloc de code avec le pseudocode
                const initialCode = tween.code['pseudo'] || '// Code non disponible';

                card.innerHTML = `
                    <div class="tween-name">${tween.name}</div>
                    <div class="group-content">
                        <div class="animation-zone">
                            <canvas width="200" height="150"></canvas> <!-- Réduit de 300x230 à 200x150 -->
                        </div>
                        <div class="code-zone">
                            <button class="copy-btn">Copy</button>
                            <pre class="code-block language-pseudo"><code data-codes='${codeData}'>${initialCode}</code></pre>
                        </div>
                    </div>
                `;

                groupsContainer.appendChild(card);

                const canvas = card.querySelector("canvas");
                const tweenFunction = buildTweenFunction(tween.function);
                new TweenAnimator(canvas, tweenFunction);
            });

            setupLanguageSelector();
            setupCopyButtons();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.nextElementSibling.textContent;
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = 'Copied';
                setTimeout(() => btn.textContent = 'Copy', 1500);
            });
        });
    });
}

function setupLanguageSelector() {
    const buttons = document.querySelectorAll('.language-selector button');
    let currentLang = 'pseudo'; // Langage par défaut changé en pseudocode

    function updateAllCodeBlocks() {
        const blocks = document.querySelectorAll('.code-block');

        blocks.forEach(block => {
            const codeElement = block.querySelector('code');

            if (!codeElement) return;

            // Récupérer les données de code depuis dataset.codes
            const codeData = JSON.parse(codeElement.dataset.codes || '{}');
            const code = codeData[currentLang] || '// Code non disponible';

            // Mettre à jour le contenu du bloc de code
            codeElement.textContent = code;

            // Mettre à jour la classe pour PrismJS
            codeElement.className = `language-${currentLang}`;

            // Appliquer la coloration syntaxique
            Prism.highlightElement(codeElement);
        });
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLang = btn.dataset.lang;
            updateAllCodeBlocks();
        });
    });

    // Appliquer la mise à jour initiale
    updateAllCodeBlocks();
}

function buildTweenFunction(codeString) {
    return new Function('t', `return ${codeString};`);
}

class TweenAnimator {
    constructor(canvas, tweenFunction) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tweenFunction = tweenFunction;

        this.width = canvas.width;
        this.height = canvas.height;

        this.duration = 2000;
        this.pause = 500;

        this.state = 'pauseStart';
        this.lastStateChange = performance.now();
        this.tStartTime = null;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    drawCurve(x, y, width, height, t) {
        const ctx = this.ctx;

        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const progress = i / 100;
            const px = x + progress * width;
            const py = y + (1 - this.tweenFunction(progress)) * height;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        const pointX = x + t * width;
        const pointY = y + (1 - this.tweenFunction(t)) * height;

        ctx.beginPath();
        ctx.arc(pointX, pointY, 3, 0, Math.PI * 2); // Réduit la taille du point de 5 à 3
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    drawTimelineBar(x, y, width, height, t, curveX, curveY) {
        const ctx = this.ctx;

        const cursorX = x + t * width;
        const centerY = y + height / 2;

        ctx.beginPath();
        ctx.moveTo(curveX, curveY);
        ctx.lineTo(cursorX, centerY);
        ctx.strokeStyle = '#FFFFFF30';
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(cursorX, centerY, height / 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    drawVerticalBar(x, y, width, height, t, curveX, curveY) {
        const ctx = this.ctx;

        const tweenY = y + (1 - this.tweenFunction(t)) * height;
        const centerX = x + width / 2;

        ctx.beginPath();
        ctx.moveTo(curveX, curveY);
        ctx.lineTo(centerX, tweenY);
        ctx.strokeStyle = '#FFFFFF30';
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(centerX, tweenY, width / 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    animate(timestamp) {
        if (!this.lastStateChange) {
            this.lastStateChange = timestamp;
        }

        const elapsed = timestamp - this.lastStateChange;

        if (this.state === 'pauseStart' && elapsed >= this.pause) {
            this.state = 'running';
            this.lastStateChange = timestamp;
            this.tStartTime = timestamp;
        } else if (this.state === 'running' && timestamp - this.tStartTime >= this.duration) {
            this.state = 'pauseEnd';
            this.lastStateChange = timestamp;
            this.tStartTime = null;
        } else if (this.state === 'pauseEnd' && elapsed >= this.pause) {
            this.state = 'pauseStart';
            this.lastStateChange = timestamp;
        }

        let t = 0;
        if (this.state === 'running') {
            const tElapsed = timestamp - this.tStartTime;
            t = Math.min(tElapsed / this.duration, 1);
        } else if (this.state === 'pauseEnd') {
            t = 1;
        } else {
            t = 0;
        }

        // Ajuster les dimensions pour le nouveau canvas (200x150)
        const curveX = 15 + t * 170; // Réduit de 20 + t * 250
        const curveY = 30 + (1 - this.tweenFunction(t)) * 80; // Réduit de 50 + (1 - t) * 120

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawCurve(15, 30, 170, 80, t); // Réduit de 20, 50, 250, 120
        this.drawTimelineBar(15, 140, 170, 15, t, curveX, curveY); // Réduit de 20, 210, 250, 20
        this.drawVerticalBar(190, 30, 15, 80, t, curveX, curveY); // Réduit de 280, 50, 20, 120
        requestAnimationFrame(this.animate);
    }
}