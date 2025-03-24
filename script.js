// Set the default active language for code snippets
let activeLanguage = 'pseudo';

// Initialize the application once the DOM content is loaded
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Fetch the tween definitions from the JSON file
    fetch("tweens.json")
        .then(response => response.json())
        .then(tweens => {
            const groupsContainer = document.querySelector('.tween-grid');

            // Iterate over each tween object from the JSON data
            tweens.forEach(tween => {
                // Create a new card element for each tween group
                const card = document.createElement("div");
                card.classList.add("group-card");
                // Convert the tween code object to a JSON string for storage in a data attribute
                const codeData = JSON.stringify(tween.code);
                // Get the initial code for the 'pseudo' language or show a fallback message if not available
                const initialCode = tween.code['pseudo'] || '// Code non disponible';

                // Set the inner HTML of the card including tween name, animation canvas, and code display
                card.innerHTML = `
                    <div class="tween-name">${tween.name}</div>
                    <div class="group-content">
                        <div class="animation-zone">
                            <canvas width="200" height="150"></canvas> <!-- Reduced canvas size from 300x230 to 200x150 -->
                        </div>
                        <div class="code-zone">
                            <button class="copy-btn">Copy</button>
                            <pre class="code-block language-pseudo"><code data-codes='${codeData}'>${initialCode}</code></pre>
                        </div>
                    </div>
                `;

                // Append the new card to the container holding all tween cards
                groupsContainer.appendChild(card);

                // Get the canvas element within the card and build the tween function for the animation
                const canvas = card.querySelector("canvas");
                const tweenFunction = buildTweenFunction(tween.function);
                new TweenAnimator(canvas, tweenFunction);
            });

            // Set up language switching and copy button functionality
            setupLanguageSelector();
            setupCopyButtons();
        })
        .catch(error => {
            // Log any errors encountered during the fetch process
            console.error('Error:', error);
        });
}

// Set up copy buttons to allow users to copy code to the clipboard
function setupCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Get the text content of the adjacent code block
            const code = btn.nextElementSibling.textContent;
            navigator.clipboard.writeText(code).then(() => {
                // Change button text to indicate the code has been copied
                btn.textContent = 'Copied';
                // Revert the button text after 1.5 seconds
                setTimeout(() => btn.textContent = 'Copy', 1500);
            });
        });
    });
}

// Set up the language selector to allow switching between code languages
function setupLanguageSelector() {
    const buttons = document.querySelectorAll('.language-selector button');
    let currentLang = 'pseudo';

    // Function to update the content of all code blocks based on the selected language
    function updateAllCodeBlocks() {
        const blocks = document.querySelectorAll('.code-block');

        blocks.forEach(block => {
            const codeElement = block.querySelector('code');
            if (!codeElement) return;
            // Parse the stored code data from the element's dataset
            const codeData = JSON.parse(codeElement.dataset.codes || '{}');
            // Retrieve the code in the current language or display a fallback message
            const code = codeData[currentLang] || '// Code non disponible';
            codeElement.textContent = code;
            // Update the code element's class to trigger correct syntax highlighting
            codeElement.className = `language-${currentLang}`;
            // Re-highlight the code block using Prism.js
            Prism.highlightElement(codeElement);
        });
    }

    // Add click listeners for each language button to update the active language and code blocks
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLang = btn.dataset.lang;
            updateAllCodeBlocks();
        });
    });
    updateAllCodeBlocks();
}

// Build a tween function from a string of code, allowing dynamic evaluation
function buildTweenFunction(codeString) {
    return new Function('t', `return ${codeString};`);
}

// TweenAnimator class manages the animation on the canvas using tween functions
class TweenAnimator {
    constructor(canvas, tweenFunction) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tweenFunction = tweenFunction;

        this.width = canvas.width;
        this.height = canvas.height;

        // Animation duration and pause durations in milliseconds
        this.duration = 2000;
        this.pause = 500;

        // Initial state setup for the animation
        this.state = 'pauseStart';
        this.lastStateChange = performance.now();
        this.tStartTime = null;
        // Bind the animate method to preserve context in the animation loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    // Draw the tween curve along with a moving point that indicates progress
    drawCurve(x, y, width, height, t) {
        const ctx = this.ctx;

        ctx.beginPath();
        // Draw the curve by iterating over 101 points (from 0 to 1 progress)
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

        // Draw a small circle to indicate the current progress on the curve
        const pointX = x + t * width;
        const pointY = y + (1 - this.tweenFunction(t)) * height;

        ctx.beginPath();
        ctx.arc(pointX, pointY, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    // Draw the timeline bar that visually connects the curve to a progress indicator
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

        // Draw a circular cursor on the timeline bar
        ctx.beginPath();
        ctx.arc(cursorX, centerY, height / 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    // Draw the vertical bar that connects the tween curve to a vertical indicator
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

        // Draw a circular indicator at the end of the vertical bar
        ctx.beginPath();
        ctx.arc(centerX, tweenY, width / 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    // Main animation loop: update the animation state, calculate progress, and redraw the canvas
    animate(timestamp) {
        if (!this.lastStateChange) {
            this.lastStateChange = timestamp;
        }

        const elapsed = timestamp - this.lastStateChange;

        // Transition between pause and running states based on elapsed time
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

        // Determine the current progress (t) of the animation between 0 and 1
        let t = 0;
        if (this.state === 'running') {
            const tElapsed = timestamp - this.tStartTime;
            t = Math.min(tElapsed / this.duration, 1);
        } else if (this.state === 'pauseEnd') {
            t = 1;
        } else {
            t = 0;
        }

        // Calculate positions for drawing the animated elements based on current progress
        const curveX = 15 + t * 170;
        const curveY = 30 + (1 - this.tweenFunction(t)) * 80; 

        // Clear the canvas before redrawing
        this.ctx.clearRect(0, 0, this.width, this.height);
        // Redraw all animation components
        this.drawCurve(15, 30, 170, 80, t);
        this.drawTimelineBar(15, 140, 170, 15, t, curveX, curveY);
        this.drawVerticalBar(190, 30, 15, 80, t, curveX, curveY);
        // Request the next frame of the animation
        requestAnimationFrame(this.animate);
    }
}
