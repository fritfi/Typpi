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
    const caseSensitiveToggle = document.getElementById('case-sensitive-toggle');
    const punctuationToggle = document.getElementById('punctuation-toggle');

    // Auth DOM Elements
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const syncStatus = document.getElementById('sync-status');

    // Toggle state
    let isCaseSensitive = true;
    let includePunctuation = true;

    // State
    let documents = [];
    let activeDocId = null;

    // Firebase State
    let firebaseApp = null;
    let auth = null;
    let db = null;
    let currentUser = null;
    let isSyncing = false;

    // WPM State
    let startTime = null;
    let totalPausedTime = 0;
    let lastKeyTime = null;
    let isTimerRunning = false;
    let typedEntries = 0;

    // Constants
    const STORAGE_KEY = 'typpi_documents_v1';
    const FIREBASE_CONFIG_KEY = 'typpi_firebase_config';
    const PAUSE_THRESHOLD = 2000;

    // Firebase Configuration
    const DEFAULT_FIREBASE_CONFIG = {
        apiKey: "AIzaSyCnn6nutLLdj4K4kC9YUeuDEIjS8LevlGQ",
        authDomain: "typpi-1519a.firebaseapp.com",
        projectId: "typpi-1519a",
        storageBucket: "typpi-1519a.firebasestorage.app",
        messagingSenderId: "843068556654",
        appId: "1:843068556654:web:478c5d23e41056859c6d7f"
    };

    // Initialize
    loadDocuments();
    renderTabs();
    initFirebase();

    if (documents.length > 0) {
        renderTabs();
        showInputScreen();
    } else {
        showInputScreen();
    }

    // Event Listeners
    newTabBtn.addEventListener('click', () => {
        activeDocId = null;
        renderTabs();
        showInputScreen();
        resetTimer();
    });

    startBtn.addEventListener('click', createDocument);

    caseSensitiveToggle.addEventListener('change', (e) => {
        isCaseSensitive = e.target.checked;
    });

    punctuationToggle.addEventListener('change', (e) => {
        includePunctuation = e.target.checked;
    });

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

    // Auth Event Listeners
    if (signInBtn) {
        signInBtn.addEventListener('click', signInWithGoogle);
    }
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }

    // --- Firebase Initialization ---

    function initFirebase() {
        // Wait for Firebase modules to be ready
        if (window.firebaseModules) {
            setupFirebase();
        } else {
            window.addEventListener('firebase-ready', setupFirebase);
        }
    }

    function setupFirebase() {
        const config = getFirebaseConfig();
        if (!config.apiKey) {
            console.log('Firebase not configured. Cloud sync disabled.');
            return;
        }

        try {
            const { initializeApp, getAuth, onAuthStateChanged, getFirestore } = window.firebaseModules;

            firebaseApp = initializeApp(config);
            auth = getAuth(firebaseApp);
            db = getFirestore(firebaseApp);

            // Listen for auth state changes
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    currentUser = user;
                    onUserSignedIn(user);
                } else {
                    currentUser = null;
                    onUserSignedOut();
                }
            });

            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    function getFirebaseConfig() {
        // Check localStorage for saved config
        const savedConfig = localStorage.getItem(FIREBASE_CONFIG_KEY);
        if (savedConfig) {
            try {
                return JSON.parse(savedConfig);
            } catch (e) {
                console.error('Error parsing saved Firebase config');
            }
        }
        return DEFAULT_FIREBASE_CONFIG;
    }

    // --- Authentication ---

    async function signInWithGoogle() {
        if (!auth) {
            alert('Firebase not configured. Please add your Firebase config to enable cloud sync.\n\nFor now, your notes are saved locally in your browser.');
            promptForFirebaseConfig();
            return;
        }

        try {
            const { signInWithPopup, GoogleAuthProvider } = window.firebaseModules;
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Sign in error:', error);
            if (error.code !== 'auth/popup-closed-by-user') {
                alert('Sign in failed: ' + error.message);
            }
        }
    }

    async function handleSignOut() {
        if (!auth) return;

        try {
            const { signOut } = window.firebaseModules;
            await signOut(auth);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }

    function onUserSignedIn(user) {
        console.log('User signed in:', user.displayName);

        // Update UI
        if (signInBtn) signInBtn.classList.add('hidden');
        if (userProfile) userProfile.classList.remove('hidden');
        if (userAvatar) userAvatar.src = user.photoURL || '';
        if (userName) userName.textContent = user.displayName || user.email;

        // Sync documents
        syncFromCloud();
    }

    function onUserSignedOut() {
        console.log('User signed out');

        // Update UI
        if (signInBtn) signInBtn.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
    }

    // --- Cloud Sync ---

    async function syncFromCloud() {
        if (!db || !currentUser || isSyncing) return;

        isSyncing = true;
        updateSyncStatus('syncing');

        try {
            const { collection, getDocs } = window.firebaseModules;
            const docsRef = collection(db, 'users', currentUser.uid, 'documents');
            const snapshot = await getDocs(docsRef);

            const cloudDocs = [];
            snapshot.forEach((doc) => {
                cloudDocs.push({ id: doc.id, ...doc.data() });
            });

            // Merge cloud docs with local docs
            mergeDocuments(cloudDocs);

            updateSyncStatus('synced');
        } catch (error) {
            console.error('Sync from cloud error:', error);
            updateSyncStatus('offline');
        } finally {
            isSyncing = false;
        }
    }

    async function syncToCloud(doc) {
        if (!db || !currentUser) return;

        updateSyncStatus('syncing');

        try {
            const { doc: docRef, setDoc, serverTimestamp } = window.firebaseModules;
            const documentRef = docRef(db, 'users', currentUser.uid, 'documents', doc.id);

            await setDoc(documentRef, {
                ...doc,
                updatedAt: serverTimestamp()
            });

            updateSyncStatus('synced');
        } catch (error) {
            console.error('Sync to cloud error:', error);
            updateSyncStatus('offline');
        }
    }

    async function deleteFromCloud(docId) {
        if (!db || !currentUser) return;

        try {
            const { doc: docRef, deleteDoc } = window.firebaseModules;
            const documentRef = docRef(db, 'users', currentUser.uid, 'documents', docId);
            await deleteDoc(documentRef);
        } catch (error) {
            console.error('Delete from cloud error:', error);
        }
    }

    function mergeDocuments(cloudDocs) {
        // Simple merge: cloud docs take precedence for same ID
        // New local docs are kept
        const mergedMap = new Map();

        // Add local docs first
        documents.forEach(doc => {
            mergedMap.set(doc.id, doc);
        });

        // Cloud docs override or add
        cloudDocs.forEach(cloudDoc => {
            const localDoc = mergedMap.get(cloudDoc.id);
            if (!localDoc || (cloudDoc.updatedAt && (!localDoc.updatedAt || cloudDoc.updatedAt > localDoc.updatedAt))) {
                mergedMap.set(cloudDoc.id, cloudDoc);
            }
        });

        documents = Array.from(mergedMap.values());
        saveDocuments();
        renderTabs();

        // Push any local-only docs to cloud
        documents.forEach(doc => {
            const inCloud = cloudDocs.find(cd => cd.id === doc.id);
            if (!inCloud) {
                syncToCloud(doc);
            }
        });
    }

    function updateSyncStatus(status) {
        if (!syncStatus) return;

        syncStatus.className = 'sync-status';
        switch (status) {
            case 'syncing':
                syncStatus.textContent = 'Syncing...';
                syncStatus.classList.add('syncing');
                break;
            case 'synced':
                syncStatus.textContent = 'Synced ✓';
                break;
            case 'offline':
                syncStatus.textContent = 'Offline';
                syncStatus.classList.add('offline');
                break;
        }
    }

    function promptForFirebaseConfig() {
        const configStr = prompt(
            'Enter your Firebase config JSON (from Firebase Console > Project Settings > Your apps > Config):\n\n' +
            'Example: {"apiKey":"...", "authDomain":"...", "projectId":"...", ...}'
        );

        if (configStr) {
            try {
                const config = JSON.parse(configStr);
                if (config.apiKey && config.projectId) {
                    localStorage.setItem(FIREBASE_CONFIG_KEY, configStr);
                    alert('Firebase config saved! Reloading...');
                    window.location.reload();
                } else {
                    alert('Invalid config. Must include apiKey and projectId.');
                }
            } catch (e) {
                alert('Invalid JSON format. Please copy the config object from Firebase Console.');
            }
        }
    }

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
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        documents.forEach(d => d.isActive = false);
        documents.push(newDoc);
        saveDocuments();

        // Sync to cloud if signed in
        if (currentUser) {
            syncToCloud(newDoc);
        }

        sourceText.value = '';
        switchTab(newDoc.id);
    }

    function switchTab(id) {
        activeDocId = id;
        resetTimer();

        documents.forEach(d => d.isActive = (d.id === id));
        saveDocuments();

        const doc = documents.find(d => d.id === id);
        if (!doc) return;

        renderTabs();
        renderTypingView(doc);
    }

    function closeTab(e, id) {
        documents = documents.filter(d => d.id !== id);
        saveDocuments();

        // Delete from cloud if signed in
        if (currentUser) {
            deleteFromCloud(id);
        }

        if (documents.length === 0) {
            activeDocId = null;
            renderTabs();
            showInputScreen();
            resetTimer();
        } else if (activeDocId === id) {
            switchTab(documents[documents.length - 1].id);
        } else {
            renderTabs();
        }
    }

    // --- Rendering ---

    function renderTabs() {
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

        const currentSpan = typingArea.querySelector('.char.current');
        if (currentSpan) {
            setTimeout(() => scrollToCursor(currentSpan), 10);
        } else if (doc.currentIndex >= doc.content.length) {
            finishPractice();
        }

        updateProgressUI(doc);

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
        let effectiveTimeEnd = now;
        if (now - lastKeyTime > PAUSE_THRESHOLD) {
            effectiveTimeEnd = lastKeyTime + PAUSE_THRESHOLD;
        }

        const durationMs = effectiveTimeEnd - startTime - totalPausedTime;
        const durationMin = durationMs / 60000;

        if (durationMin <= 0) return 0;

        const wpm = Math.round((doc.currentIndex / 5) / durationMin);
        return wpm;
    }

    // --- Typing Logic ---

    function handleTyping(e) {
        if (!activeDocId) return;

        const doc = documents.find(d => d.id === activeDocId);
        if (!doc) return;

        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;

        const charSpans = typingArea.querySelectorAll('.char');
        if (doc.currentIndex >= doc.content.length) return;

        const targetChar = doc.content[doc.currentIndex];
        const typedChar = e.key;

        if (e.key === 'Backspace') {
            if (doc.currentIndex > 0) {
                if (charSpans[doc.currentIndex]) charSpans[doc.currentIndex].classList.remove('current');

                doc.currentIndex--;
                saveDocuments();

                const prevSpan = charSpans[doc.currentIndex];
                prevSpan.classList.remove('typed', 'error');
                prevSpan.classList.add('current');

                scrollToCursor(prevSpan);
                updateProgressUI(doc);
            }
            return;
        }

        if (e.key === 'Enter') {
            if (targetChar === '\n') {
                updateTimer();
                advanceCursor(doc, charSpans);
            }
            return;
        }

        if (typedChar.length === 1) {
            updateTimer();

            const isPunctuation = /[^\w\s]/.test(targetChar);
            if (isPunctuation && !includePunctuation) {
                charSpans[doc.currentIndex].classList.add('typed', 'skipped');
                advanceCursor(doc, charSpans);
                while (doc.currentIndex < doc.content.length) {
                    const nextChar = doc.content[doc.currentIndex];
                    if (/[^\w\s]/.test(nextChar) && !includePunctuation) {
                        charSpans[doc.currentIndex].classList.add('typed', 'skipped');
                        advanceCursor(doc, charSpans);
                    } else {
                        break;
                    }
                }
                return;
            }

            let isCorrect = false;
            if (isCaseSensitive) {
                isCorrect = typedChar === targetChar;
            } else {
                isCorrect = typedChar.toLowerCase() === targetChar.toLowerCase();
            }

            if (isCorrect) {
                charSpans[doc.currentIndex].classList.add('typed');
                advanceCursor(doc, charSpans);

                while (!includePunctuation && doc.currentIndex < doc.content.length) {
                    const nextChar = doc.content[doc.currentIndex];
                    if (/[^\w\s]/.test(nextChar)) {
                        charSpans[doc.currentIndex].classList.add('typed', 'skipped');
                        advanceCursor(doc, charSpans);
                    } else {
                        break;
                    }
                }
            } else {
                const currentSpan = charSpans[doc.currentIndex];
                currentSpan.classList.add('error');
                setTimeout(() => currentSpan.classList.remove('error'), 200);
            }
        }
    }

    function advanceCursor(doc, charSpans) {
        charSpans[doc.currentIndex].classList.remove('current');

        doc.currentIndex++;
        doc.updatedAt = new Date().toISOString();
        saveDocuments();
        updateProgressUI(doc);

        // Sync progress to cloud periodically (every 10%)
        if (currentUser && doc.currentIndex % Math.ceil(doc.content.length / 10) === 0) {
            syncToCloud(doc);
        }

        if (doc.currentIndex < doc.content.length) {
            const nextSpan = charSpans[doc.currentIndex];
            nextSpan.classList.add('current');
            scrollToCursor(nextSpan);
        } else {
            finishPractice();
            if (currentUser) {
                syncToCloud(doc);
            }
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
});
