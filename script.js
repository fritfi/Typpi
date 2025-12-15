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
    const completionMessage = document.getElementById('completion-message');
    const restartBtn = document.getElementById('restart-btn');

    // State
    let documents = [];
    let activeDocId = null;

    // Constants
    const STORAGE_KEY = 'typpi_documents_v1';

    // Initialize
    loadDocuments();
    renderTabs();

    if (documents.length > 0) {
        // Activate last active or first
        const lastActive = documents.find(d => d.isActive);
        if (lastActive) {
            switchTab(lastActive.id);
        } else {
            switchTab(documents[0].id);
        }
    } else {
        showInputScreen();
    }

    // Event Listeners
    newTabBtn.addEventListener('click', () => {
        activeDocId = null;
        renderTabs(); // Clear active state visually
        showInputScreen();
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

        // Update active state in data
        documents.forEach(d => d.isActive = (d.id === id));
        saveDocuments();

        const doc = documents.find(d => d.id === id);
        if (!doc) return;

        renderTabs();
        renderTypingView(doc);
    }

    function closeTab(e, id) {
        e.stopPropagation(); // Prevent switching to tab when closing

        const confirmDelete = confirm('Delete this note?');
        if (!confirmDelete) return;

        documents = documents.filter(d => d.id !== id);
        saveDocuments();

        if (documents.length === 0) {
            activeDocId = null;
            renderTabs();
            showInputScreen();
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
        document.body.focus();
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
                advanceCursor(doc, charSpans);
            }
            return;
        }

        // Normal typing
        if (typedChar.length === 1) {
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
    }

    function finishPractice() {
        typingArea.classList.add('hidden');
        completionMessage.classList.remove('hidden');
    }
});
