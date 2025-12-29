document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const documentSelect = document.getElementById('document-select');
    const ghostInfo = document.getElementById('ghost-info');
    const noGhostMessage = document.getElementById('no-ghost-message');
    const bestTimeEl = document.getElementById('best-time');
    const bestWpmEl = document.getElementById('best-wpm');
    const startRaceBtn = document.getElementById('start-race-btn');

    const raceSelectScreen = document.getElementById('race-select-screen');
    const raceScreen = document.getElementById('race-screen');
    const raceResultsScreen = document.getElementById('race-results-screen');

    const ghostProgressBar = document.getElementById('ghost-progress-bar');
    const playerProgressBar = document.getElementById('player-progress-bar');
    const ghostPercent = document.getElementById('ghost-percent');
    const playerPercent = document.getElementById('player-percent');
    const ghostWpm = document.getElementById('ghost-wpm');
    const playerWpm = document.getElementById('player-wpm');
    const raceTypingArea = document.getElementById('race-typing-area');

    const resultMessage = document.getElementById('result-message');
    const resultTime = document.getElementById('result-time');
    const resultWpm = document.getElementById('result-wpm');
    const raceAgainBtn = document.getElementById('race-again-btn');
    const backToSelectBtn = document.getElementById('back-to-select-btn');

    // Constants
    const DOCUMENTS_KEY = 'typpi_documents_v1';
    const GHOSTS_KEY = 'typpi_ghosts_v1';

    // State
    let documents = [];
    let ghosts = {};
    let selectedDoc = null;
    let currentGhost = null;
    let currentIndex = 0;
    let keystrokes = [];
    let raceStartTime = null;
    let ghostInterval = null;
    let ghostIndex = 0;

    // Initialize
    loadDocuments();
    loadGhosts();
    populateDocumentSelect();

    // Event Listeners
    documentSelect.addEventListener('change', onDocumentSelect);
    startRaceBtn.addEventListener('click', startRace);
    raceAgainBtn.addEventListener('click', () => startRace());
    backToSelectBtn.addEventListener('click', backToSelect);
    document.addEventListener('keydown', handleTyping);

    // --- Data Loading ---
    function loadDocuments() {
        const stored = localStorage.getItem(DOCUMENTS_KEY);
        if (stored) {
            try {
                documents = JSON.parse(stored);
            } catch (e) {
                documents = [];
            }
        }
    }

    function loadGhosts() {
        const stored = localStorage.getItem(GHOSTS_KEY);
        if (stored) {
            try {
                ghosts = JSON.parse(stored);
            } catch (e) {
                ghosts = {};
            }
        }
    }

    function saveGhosts() {
        localStorage.setItem(GHOSTS_KEY, JSON.stringify(ghosts));
    }

    function populateDocumentSelect() {
        documentSelect.innerHTML = '<option value="">-- Choose a document --</option>';
        documents.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.title;
            documentSelect.appendChild(option);
        });
    }

    // --- Event Handlers ---
    function onDocumentSelect() {
        const docId = documentSelect.value;
        if (!docId) {
            selectedDoc = null;
            currentGhost = null;
            ghostInfo.classList.add('hidden');
            noGhostMessage.classList.add('hidden');
            startRaceBtn.disabled = true;
            return;
        }

        selectedDoc = documents.find(d => d.id === docId);
        currentGhost = ghosts[docId] || null;

        if (currentGhost) {
            ghostInfo.classList.remove('hidden');
            noGhostMessage.classList.add('hidden');
            bestTimeEl.textContent = formatTime(currentGhost.bestTime);
            bestWpmEl.textContent = currentGhost.bestWPM;
        } else {
            ghostInfo.classList.add('hidden');
            noGhostMessage.classList.remove('hidden');
        }

        startRaceBtn.disabled = false;
    }

    function startRace() {
        if (!selectedDoc) return;

        // Reset state
        currentIndex = 0;
        keystrokes = [];
        raceStartTime = null;
        ghostIndex = 0;

        // Switch screens
        showScreen(raceScreen);

        // Render typing area
        renderTypingArea();

        // Reset progress bars
        updateProgressBars(0, 0);
        ghostWpm.textContent = '0 WPM';
        playerWpm.textContent = '0 WPM';

        // Start ghost playback if exists
        if (currentGhost && currentGhost.keystrokes.length > 0) {
            startGhostPlayback();
        }

        // Focus for typing
        document.body.focus();
    }

    function backToSelect() {
        stopGhostPlayback();
        showScreen(raceSelectScreen);
    }

    // --- Typing Logic ---
    function handleTyping(e) {
        if (!raceScreen.classList.contains('active')) return;
        if (!selectedDoc) return;

        const content = selectedDoc.content;
        if (currentIndex >= content.length) return;

        // Ignore modifier keys
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

        const charSpans = raceTypingArea.querySelectorAll('.char');
        const targetChar = content[currentIndex];
        const typedChar = e.key;

        // Handle Backspace
        if (e.key === 'Backspace') {
            if (currentIndex > 0) {
                if (charSpans[currentIndex]) {
                    charSpans[currentIndex].classList.remove('current');
                }
                currentIndex--;
                keystrokes.pop();

                const prevSpan = charSpans[currentIndex];
                prevSpan.classList.remove('typed');
                prevSpan.classList.add('current');

                updatePlayerProgress();
            }
            return;
        }

        // Handle Enter
        if (e.key === 'Enter' && targetChar === '\n') {
            recordKeystroke();
            advanceCursor(charSpans);
            return;
        }

        // Normal typing
        if (typedChar.length === 1) {
            if (typedChar === targetChar) {
                recordKeystroke();
                charSpans[currentIndex].classList.add('typed');
                advanceCursor(charSpans);
            } else {
                // Error flash
                charSpans[currentIndex].classList.add('error');
                setTimeout(() => charSpans[currentIndex].classList.remove('error'), 200);
            }
        }
    }

    function recordKeystroke() {
        if (!raceStartTime) {
            raceStartTime = Date.now();
        }
        keystrokes.push({
            index: currentIndex,
            time: Date.now() - raceStartTime
        });
    }

    function advanceCursor(charSpans) {
        charSpans[currentIndex].classList.remove('current');
        currentIndex++;
        updatePlayerProgress();

        if (currentIndex < selectedDoc.content.length) {
            charSpans[currentIndex].classList.add('current');
            scrollToCursor(charSpans[currentIndex]);
        } else {
            // Race finished!
            finishRace();
        }
    }

    function updatePlayerProgress() {
        const percent = (currentIndex / selectedDoc.content.length) * 100;
        playerProgressBar.style.width = percent + '%';
        playerPercent.textContent = Math.round(percent) + '%';

        // Calculate WPM
        if (raceStartTime) {
            const elapsed = (Date.now() - raceStartTime) / 60000; // minutes
            if (elapsed > 0) {
                const wpm = Math.round((currentIndex / 5) / elapsed);
                playerWpm.textContent = wpm + ' WPM';
            }
        }
    }

    // --- Ghost Playback ---
    function startGhostPlayback() {
        if (!currentGhost || !currentGhost.keystrokes.length) return;

        ghostIndex = 0;
        const ghostStartTime = Date.now();

        ghostInterval = setInterval(() => {
            if (ghostIndex >= currentGhost.keystrokes.length) {
                stopGhostPlayback();
                return;
            }

            const elapsed = Date.now() - ghostStartTime;

            // Advance ghost based on recorded timestamps
            while (ghostIndex < currentGhost.keystrokes.length &&
                currentGhost.keystrokes[ghostIndex].time <= elapsed) {
                ghostIndex++;
            }

            // Update ghost progress
            const percent = (ghostIndex / selectedDoc.content.length) * 100;
            ghostProgressBar.style.width = percent + '%';
            ghostPercent.textContent = Math.round(percent) + '%';

            // Calculate ghost WPM
            const elapsedMin = elapsed / 60000;
            if (elapsedMin > 0) {
                const wpm = Math.round((ghostIndex / 5) / elapsedMin);
                ghostWpm.textContent = wpm + ' WPM';
            }
        }, 50);
    }

    function stopGhostPlayback() {
        if (ghostInterval) {
            clearInterval(ghostInterval);
            ghostInterval = null;
        }
    }

    // --- Race Finish ---
    function finishRace() {
        stopGhostPlayback();

        const totalTime = Date.now() - raceStartTime;
        const finalWpm = Math.round((selectedDoc.content.length / 5) / (totalTime / 60000));

        // Show results
        resultTime.textContent = formatTime(totalTime);
        resultWpm.textContent = finalWpm;

        // Determine win/lose/first-run
        let isNewRecord = false;
        if (!currentGhost) {
            // First run
            resultMessage.className = 'result-message first-run';
            resultMessage.innerHTML = '<h2>🎉 Record Set!</h2><p>You\'ve set your first ghost record for this document.</p>';
            isNewRecord = true;
        } else if (totalTime < currentGhost.bestTime) {
            // Win!
            resultMessage.className = 'result-message win';
            const improvement = currentGhost.bestTime - totalTime;
            resultMessage.innerHTML = `<h2>🏆 New Record!</h2><p>You beat your ghost by ${formatTime(improvement)}!</p>`;
            isNewRecord = true;
        } else {
            // Lose
            resultMessage.className = 'result-message lose';
            const behind = totalTime - currentGhost.bestTime;
            resultMessage.innerHTML = `<h2>👻 Ghost Wins</h2><p>You were ${formatTime(behind)} behind your best.</p>`;
        }

        // Save new record if applicable
        if (isNewRecord) {
            ghosts[selectedDoc.id] = {
                bestTime: totalTime,
                bestWPM: finalWpm,
                keystrokes: keystrokes
            };
            saveGhosts();
            currentGhost = ghosts[selectedDoc.id];
        }

        showScreen(raceResultsScreen);
    }

    // --- UI Helpers ---
    function showScreen(screen) {
        [raceSelectScreen, raceScreen, raceResultsScreen].forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        screen.classList.remove('hidden');
        screen.classList.add('active');
    }

    function renderTypingArea() {
        raceTypingArea.innerHTML = '';
        const chars = selectedDoc.content.split('');

        chars.forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'char';
            span.dataset.index = index;

            if (index === 0) {
                span.classList.add('current');
            }
            if (char === '\n') {
                span.classList.add('newline');
            }

            raceTypingArea.appendChild(span);
        });
    }

    function scrollToCursor(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }

    function updateProgressBars(ghostPct, playerPct) {
        ghostProgressBar.style.width = ghostPct + '%';
        playerProgressBar.style.width = playerPct + '%';
        ghostPercent.textContent = Math.round(ghostPct) + '%';
        playerPercent.textContent = Math.round(playerPct) + '%';
    }

    function formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const remainingMs = Math.floor((ms % 1000) / 10);

        if (minutes > 0) {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`;
        }
        return `${seconds}.${remainingMs.toString().padStart(2, '0')}s`;
    }
});
