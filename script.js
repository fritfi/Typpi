document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const appContainer = document.querySelector('.app-container');
    const tabBar = document.getElementById('tab-bar');
    const newTabBtn = document.getElementById('new-tab-btn');
    const inputScreen = document.getElementById('input-screen');
    const typingScreen = document.getElementById('typing-screen');
    const sourceText = document.getElementById('source-text');
    const startBtn = document.getElementById('start-btn');
    const backBtn = document.getElementById('back-btn');
    const typingArea = document.getElementById('typing-area');
    const progressText = document.getElementById('progress-text');
    const wpmDisplay = document.getElementById('wpm-display');
    const completionMessage = document.getElementById('completion-message');
    const restartBtn = document.getElementById('restart-btn');

    // State
    let documents = [];
    let activeDocId = null;

    // WPM State
    let startTime = null;
    let totalPausedTime = 0;
    let lastKeyTime = null;
    let isTimerRunning = false;
    let typedEntries = 0; // Count actual keystrokes for more accurate WPM? Or just use index? Standard is (chars / 5) / min

    // Constants
    const STORAGE_KEY = 'typpi_documents_v1';
    const PAUSE_THRESHOLD = 2000; // 2 seconds

    // Initialize
    loadDocuments();
    renderTabs();

    if (documents.length > 0) {
        // Just render tabs, don't auto-switch
        // This ensures "Start Practice" is visible for new sessions
        renderTabs();
        showInputScreen();
    } else {
        showInputScreen();
    }

    // Event Listeners
    newTabBtn.addEventListener('click', () => {
        activeDocId = null;
        renderTabs(); // Clear active state visually
        showInputScreen();
        resetTimer();
    });

    startBtn.addEventListener('click', createDocument);

    // Back button now acts as "Edit" or just return to input for new doc? 
    // Actually, for tabs, "Back" might not be needed if we have tabs. 
    // Let's repurpose it to "Edit Text" or hide it if we want strict practice.
    // For now, let's hide it in tab mode to keep it simple, or make it "Delete"
    backBtn.style.display = 'none';

    restartBtn.addEventListener('click', () => {
        if (!activeDocId) return;
        const doc = documents.find(d => d.id === activeDocId);
        if (doc) {
            doc.currentIndex = 0;
            saveDocuments();
            renderTypingView(doc);
            completionMessage.classList.add('hidden');
            typingArea.classList.remove('hidden');
            resetTimer();
        }
    });

    document.addEventListener('keydown', handleTyping);

    window.addEventListener('keydown', function (e) {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
        }
    });

    // --- Core Logic ---

    function loadDocuments() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                documents = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to load documents', e);
                documents = [];
            }
        }
    }

    function saveDocuments() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    }

    function createDocument() {
        const text = sourceText.value.trim();
        if (!text) {
            alert('Please enter some text to practice!');
            return;
        }

        const newDoc = {
            id: Date.now().toString(),
            title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
            content: text,
            currentIndex: 0,
            isActive: true
        };

        // Deactivate others
        documents.forEach(d => d.isActive = false);

        documents.push(newDoc);
        saveDocuments();

        sourceText.value = ''; // Clear input
        switchTab(newDoc.id);
    }

    function switchTab(id) {
        activeDocId = id;
        resetTimer();

        // Update active state in data
        documents.forEach(d => d.isActive = (d.id === id));
        saveDocuments();

        const doc = documents.find(d => d.id === id);
        if (!doc) return;

        renderTabs();
        renderTypingView(doc);
    }

    function closeTab(e, id) {
        // e.stopPropagation(); // Prevent switching to tab when closing

        // const confirmDelete = confirm('Delete this note?');
        // if (!confirmDelete) return;

        documents = documents.filter(d => d.id !== id);
        saveDocuments();

        if (documents.length === 0) {
            activeDocId = null;
            renderTabs();
            showInputScreen();
            resetTimer();
        } else if (activeDocId === id) {
            // Switch to last available
            switchTab(documents[documents.length - 1].id);
        } else {
            renderTabs();
        }
    }

    // --- Rendering ---

    function renderTabs() {
        // Remove existing tabs (keep new button)
        const existingTabs = tabBar.querySelectorAll('.tab-item');
        existingTabs.forEach(t => t.remove());

        documents.forEach(doc => {
            const btn = document.createElement('button');
            btn.className = `tab-btn tab-item ${doc.id === activeDocId ? 'active' : ''}`;
            btn.onclick = () => switchTab(doc.id);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'tab-title';
            titleSpan.textContent = doc.title;

            const closeSpan = document.createElement('span');
            closeSpan.className = 'close-tab';
            closeSpan.innerHTML = '&times;';
            closeSpan.onclick = (e) => closeTab(e, doc.id);

            btn.appendChild(titleSpan);
            btn.appendChild(closeSpan);

            tabBar.insertBefore(btn, newTabBtn);
        });
    }

    function showInputScreen() {
        appContainer.classList.remove('practice-mode');
        typingScreen.classList.remove('active');
        typingScreen.classList.add('hidden');
        inputScreen.classList.remove('hidden');
        inputScreen.classList.add('active');

        // Focus textarea
        sourceText.focus();
    }

    function renderTypingView(doc) {
        console.log('Rendering typing view for doc:', doc);
        console.log('Typing area element:', typingArea);

        appContainer.classList.add('practice-mode');
        inputScreen.classList.remove('active');
        inputScreen.classList.add('hidden');
        typingScreen.classList.remove('hidden');
        typingScreen.classList.add('active');
        completionMessage.classList.add('hidden');
        typingArea.classList.remove('hidden');

        // Render text
        typingArea.innerHTML = '';
        const chars = doc.content.split('');

        chars.forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'char';
            span.dataset.index = index;

            if (index < doc.currentIndex) {
                span.classList.add('typed');
            } else if (index === doc.currentIndex) {
                span.classList.add('current');
            }

            if (char === '\n') {
                span.classList.add('newline');
            }

            typingArea.appendChild(span);
        });

        // Scroll to current
        const currentSpan = typingArea.querySelector('.char.current');
        if (currentSpan) {
            setTimeout(() => scrollToCursor(currentSpan), 10);
        } else if (doc.currentIndex >= doc.content.length) {
            finishPractice();
        }

        updateProgressUI(doc);

        // Remove focus from buttons so Space doesn't trigger them
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        document.body.focus();
    }

    // --- WPM Logic ---

    function startTimer() {
        if (!isTimerRunning) {
            startTime = Date.now();
            lastKeyTime = startTime;
            isTimerRunning = true;
            totalPausedTime = 0;
        }
    }

    function updateTimer() {
        if (!isTimerRunning) {
            startTimer();
        } else {
            const now = Date.now();
            const timeSinceLastKey = now - lastKeyTime;

            if (timeSinceLastKey > PAUSE_THRESHOLD) {
                // Add pause duration to totalPausedTime
                // We subtract the threshold because that part is considered "thinking time" or just a long pause?
                // Actually, if I pause for 10s, I want to exclude that 10s.
                // But if I pause for 1.9s, I include it.
                // So if > 2s, we exclude the entire duration? Or just the excess?
                // The prompt says "accounting for pauses and breaks".
                // Let's exclude the entire duration of the pause if it exceeds the threshold, 
                // effectively "stopping the clock" during the pause.
                // But we need to keep the "thinking time" reasonable. 
                // Let's say we exclude (timeSinceLastKey - PAUSE_THRESHOLD) to be generous, 
                // or exclude the whole thing. 
                // Let's exclude (timeSinceLastKey - PAUSE_THRESHOLD) so strict typing isn't penalized, 
                // but long breaks are.
                // Actually, simpler: just add to paused time.
                totalPausedTime += (timeSinceLastKey - PAUSE_THRESHOLD);
            }
            lastKeyTime = now;
        }
    }

    function resetTimer() {
        startTime = null;
        totalPausedTime = 0;
        lastKeyTime = null;
        isTimerRunning = false;
        wpmDisplay.textContent = '0 WPM';
    }

    function calculateWPM(doc) {
        if (!startTime) return 0;

        const now = Date.now();
        // If we are currently in a pause (haven't typed for > 2s), we shouldn't count that current pause yet 
        // until the next key press? Or should we?
        // If I stop typing now, my WPM should drop until I type again?
        // No, if I stop, the timer keeps running until I type again, at which point we detect the pause.
        // So for real-time display, we might want to show WPM based on *active* time.

        // Let's use the lastKeyTime for the end of the interval if we are currently paused?
        // No, standard WPM decays if you stop. 
        // But the user wants to "account for pauses". 
        // So if I stop for 10s, my WPM shouldn't drop to 0. It should stay at what it was.

        let effectiveTimeEnd = now;
        if (now - lastKeyTime > PAUSE_THRESHOLD) {
            // We are currently in a pause.
            // So effective time ends at lastKeyTime + threshold?
            effectiveTimeEnd = lastKeyTime + PAUSE_THRESHOLD;
        }

        const durationMs = effectiveTimeEnd - startTime - totalPausedTime;
        const durationMin = durationMs / 60000;

        if (durationMin <= 0) return 0;

        // Standard WPM = (All Typed Characters / 5) / Time (min)
        // We use doc.currentIndex as proxy for characters typed correctly (since we only advance on correct)
        const wpm = Math.round((doc.currentIndex / 5) / durationMin);
        return wpm;
    }

    // --- Typing Logic ---

    function handleTyping(e) {
        if (!activeDocId) return;

        const doc = documents.find(d => d.id === activeDocId);
        if (!doc) return;

        // Ignore modifier keys
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

        const charSpans = typingArea.querySelectorAll('.char');
        if (doc.currentIndex >= doc.content.length) return;

        const targetChar = doc.content[doc.currentIndex];
        const typedChar = e.key;

        // Handle Backspace
        if (e.key === 'Backspace') {
            if (doc.currentIndex > 0) {
                // Reset current
                if (charSpans[doc.currentIndex]) charSpans[doc.currentIndex].classList.remove('current');

                doc.currentIndex--;
                saveDocuments();

                // Update new current
                const prevSpan = charSpans[doc.currentIndex];
                prevSpan.classList.remove('typed', 'error');
                prevSpan.classList.add('current');

                scrollToCursor(prevSpan);
                updateProgressUI(doc);
            }
            return;
        }

        // Handle Enter
        if (e.key === 'Enter') {
            if (targetChar === '\n') {
                updateTimer(); // Update timer on valid key
                advanceCursor(doc, charSpans);
            }
            return;
        }

        // Normal typing
        if (typedChar.length === 1) {
            updateTimer(); // Update timer on valid key attempt (even if wrong? No, usually WPM counts all keystrokes, but here we only advance on correct. Let's count time for all attempts but only advance for correct.)

            if (typedChar === targetChar) {
                // Correct
                charSpans[doc.currentIndex].classList.add('typed');
                advanceCursor(doc, charSpans);
            } else {
                // Incorrect
                const currentSpan = charSpans[doc.currentIndex];
                currentSpan.classList.add('error');
                setTimeout(() => currentSpan.classList.remove('error'), 200);
            }
        }
    }

    function advanceCursor(doc, charSpans) {
        // Remove current from old
        charSpans[doc.currentIndex].classList.remove('current');

        doc.currentIndex++;
        saveDocuments();
        updateProgressUI(doc);

        if (doc.currentIndex < doc.content.length) {
            // Add current to new
            const nextSpan = charSpans[doc.currentIndex];
            nextSpan.classList.add('current');
            scrollToCursor(nextSpan);
        } else {
            // Finished
            finishPractice();
        }
    }

    function scrollToCursor(element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }

    function updateProgressUI(doc) {
        const percentage = Math.round((doc.currentIndex / doc.content.length) * 100);
        progressText.textContent = `${percentage}%`;

        const wpm = calculateWPM(doc);
        wpmDisplay.textContent = `${wpm} WPM`;
    }

    function finishPractice() {
        typingArea.classList.add('hidden');
        completionMessage.classList.remove('hidden');
    }

    // Initialize Glass Surface
    const glassWrapper = document.getElementById('glass-wrapper');
    if (glassWrapper) {
        new GlassSurface(glassWrapper, {
            width: '100%',
            height: 'auto',
            borderRadius: 20,
            borderWidth: 0.07,
            brightness: 50,
            opacity: 0.93,
            blur: 11,
            displace: 15, // Using custom values from user request
            distortionScale: -150,
            redOffset: 5,
            greenOffset: 15,
            blueOffset: 25,
            mixBlendMode: 'screen',
            backgroundOpacity: 0.1
        });
    }
});
