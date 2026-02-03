// WordCounter Pro Application
(function() {
    'use strict';

    // ==================== Translations ====================
    const i18n = {
        zh: {
            words: '字',
            chars: '字符',
            paragraphs: '段落',
            readingTime: '分钟阅读',
            writingTime: '写作时长',
            goal: '目标',
            setGoal: '设置写作目标',
            startWriting: '开始写作...',
            untitled: '无标题文档',
            documents: '文档',
            saved: '已保存',
            saving: '保存中...',
            unsaved: '未保存',
            writingStats: '写作统计',
            totalWords: '总字数',
            totalChars: '总字符',
            totalTime: '写作时间',
            avgSpeed: '字/分钟',
            confirmDelete: '确定要删除此文档吗？',
            cancel: '取消',
            delete: '删除',
            exported: '已导出',
            focusMode: '专注模式',
            normalMode: '普通模式',
            newDocument: '新建文档',
            remaining: '还需',
            estimate: '预计'
        },
        en: {
            words: 'words',
            chars: 'chars',
            paragraphs: 'paragraphs',
            readingTime: 'min read',
            writingTime: 'writing time',
            goal: 'Goal',
            setGoal: 'Set Writing Goal',
            startWriting: 'Start writing...',
            untitled: 'Untitled',
            documents: 'Documents',
            saved: 'Saved',
            saving: 'Saving...',
            unsaved: 'Unsaved',
            writingStats: 'Writing Statistics',
            totalWords: 'Total Words',
            totalChars: 'Total Chars',
            totalTime: 'Time',
            avgSpeed: 'words/min',
            confirmDelete: 'Delete this document?',
            cancel: 'Cancel',
            delete: 'Delete',
            exported: 'Exported',
            focusMode: 'Focus Mode',
            normalMode: 'Normal Mode',
            newDocument: 'New Document',
            remaining: 'Need',
            estimate: 'Est.'
        }
    };

    // ==================== State Management ====================
    const state = {
        currentLang: 'zh',
        currentDocId: null,
        documents: [],
        goalValue: 500,
        goalType: 'words',
        isGoalPanelOpen: false,
        isFocusMode: false,
        isSidebarCollapsed: false,
        writingStartTime: null,
        writingTimeSeconds: 0,
        wordCountHistory: [],
        lastSaveTime: Date.now(),
        hasUnsavedChanges: false,
        chartInstances: {}
    };

    // ==================== DOM Elements ====================
    const elements = {
        // Editor
        editor: document.getElementById('editor'),
        highlightLayer: document.getElementById('highlightLayer'),
        editorContainer: document.getElementById('editorContainer'),
        
        // Sidebar
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'),
        sidebarShowBtn: document.getElementById('sidebarShowBtn'),
        documentList: document.getElementById('documentList'),
        newDocBtn: document.getElementById('newDocBtn'),
        autoSaveStatus: document.getElementById('autoSaveStatus'),
        
        // Header
        docTitleInput: document.getElementById('docTitleInput'),
        focusModeBtn: document.getElementById('focusModeBtn'),
        goalToggle: document.getElementById('goalToggle'),
        
        // Goal Panel
        goalPanel: document.getElementById('goalPanel'),
        goalInput: document.getElementById('goalInput'),
        goalType: document.getElementById('goalType'),
        progressFill: document.getElementById('progressFill'),
        progressText: document.getElementById('progressText'),
        progressCurrent: document.getElementById('progressCurrent'),
        progressTarget: document.getElementById('progressTarget'),
        remainingText: document.getElementById('remainingText'),
        estimateText: document.getElementById('estimateText'),
        
        // Stats
        wordCount: document.getElementById('wordCount'),
        charCount: document.getElementById('charCount'),
        paragraphCount: document.getElementById('paragraphCount'),
        readingTime: document.getElementById('readingTime'),
        writingTime: document.getElementById('writingTime'),
        
        // Export
        exportBtn: document.getElementById('exportBtn'),
        exportMenu: document.getElementById('exportMenu'),
        
        // Stats Modal
        statsBtn: document.getElementById('statsBtn'),
        statsModal: document.getElementById('statsModal'),
        closeStatsModal: document.getElementById('closeStatsModal'),
        totalWords: document.getElementById('totalWords'),
        totalChars: document.getElementById('totalChars'),
        totalTime: document.getElementById('totalTime'),
        avgSpeed: document.getElementById('avgSpeed'),
        
        // Delete Modal
        deleteModal: document.getElementById('deleteModal'),
        cancelDelete: document.getElementById('cancelDelete'),
        confirmDelete: document.getElementById('confirmDelete'),
        
        // Toast
        toast: document.getElementById('toast'),
        
        // Language
        langBtns: document.querySelectorAll('.lang-btn')
    };

    // ==================== Utility Functions ====================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function formatDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== Count Functions ====================
    function countWords(text, lang) {
        if (!text.trim()) return 0;
        
        switch(lang) {
            case 'zh':
            case 'ja':
            case 'ko':
                return text.replace(/\s/g, '').replace(/[，。！？、；：""''（）【】]/g, '').length;
            default:
                const matches = text.trim().match(/[\w\u00C0-\u024F\u1E00-\u1EFF]+/g);
                return matches ? matches.length : 0;
        }
    }

    function countChars(text) {
        return text.length;
    }

    function countParagraphs(text) {
        if (!text.trim()) return 0;
        return text.split(/\n\s*\n/).filter(p => p.trim()).length;
    }

    function calculateReadingTime(wordCount, lang) {
        let wpm;
        switch(lang) {
            case 'zh':
            case 'ja':
            case 'ko':
                wpm = 400;
                break;
            default:
                wpm = 200;
        }
        return Math.max(1, Math.ceil(wordCount / wpm));
    }

    // ==================== Document Management ====================
    function loadDocuments() {
        const saved = localStorage.getItem('wc-documents');
        if (saved) {
            try {
                state.documents = JSON.parse(saved);
            } catch (e) {
                state.documents = [];
            }
        }
        
        if (state.documents.length === 0) {
            createNewDocument();
        } else {
            // Load last active document
            const lastId = localStorage.getItem('wc-current-doc');
            const doc = state.documents.find(d => d.id === lastId) || state.documents[0];
            loadDocument(doc.id);
        }
    }

    function saveDocuments() {
        localStorage.setItem('wc-documents', JSON.stringify(state.documents));
        localStorage.setItem('wc-current-doc', state.currentDocId);
    }

    function createNewDocument() {
        const doc = {
            id: generateId(),
            title: '',
            content: '',
            wordCount: 0,
            charCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        state.documents.unshift(doc);
        saveDocuments();
        renderDocumentList();
        loadDocument(doc.id);
        
        showToast(i18n[state.currentLang].newDocument);
    }

    function loadDocument(id) {
        const doc = state.documents.find(d => d.id === id);
        if (!doc) return;
        
        state.currentDocId = id;
        state.writingTimeSeconds = doc.writingTime || 0;
        state.wordCountHistory = doc.history || [];
        
        elements.docTitleInput.value = doc.title;
        elements.editor.value = doc.content;
        
        saveDocuments();
        renderDocumentList();
        updateStats();
        updateHighlight();
        
        // Reset writing timer
        state.writingStartTime = Date.now();
    }

    function saveCurrentDocument() {
        const doc = state.documents.find(d => d.id === state.currentDocId);
        if (!doc) return;
        
        const text = elements.editor.value;
        const words = countWords(text, state.currentLang);
        const chars = countChars(text);
        
        doc.title = elements.docTitleInput.value.trim() || i18n[state.currentLang].untitled;
        doc.content = text;
        doc.wordCount = words;
        doc.charCount = chars;
        doc.updatedAt = Date.now();
        doc.writingTime = state.writingTimeSeconds;
        
        // Record history for trend
        if (!doc.history) doc.history = [];
        if (doc.history.length === 0 || Date.now() - doc.history[doc.history.length - 1].time > 60000) {
            doc.history.push({
                time: Date.now(),
                words: words
            });
            // Keep last 50 records
            if (doc.history.length > 50) doc.history.shift();
        }
        
        saveDocuments();
        renderDocumentList();
        
        state.hasUnsavedChanges = false;
        updateSaveStatus('saved');
    }

    function deleteDocument(id) {
        state.documents = state.documents.filter(d => d.id !== id);
        saveDocuments();
        
        if (state.currentDocId === id) {
            if (state.documents.length > 0) {
                loadDocument(state.documents[0].id);
            } else {
                createNewDocument();
            }
        }
        
        renderDocumentList();
        hideModal('deleteModal');
    }

    function renderDocumentList() {
        elements.documentList.innerHTML = state.documents.map(doc => `
            <li class="document-item ${doc.id === state.currentDocId ? 'active' : ''}" data-id="${doc.id}">
                <svg class="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div class="doc-info">
                    <div class="doc-name">${escapeHtml(doc.title || i18n[state.currentLang].untitled)}</div>
                    <div class="doc-meta">${doc.wordCount} ${i18n[state.currentLang].words} · ${formatDate(doc.updatedAt)}</div>
                </div>
                <div class="doc-actions">
                    <button class="btn-icon-small delete-doc" data-id="${doc.id}" title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </li>
        `).join('');
        
        // Add click handlers
        elements.documentList.querySelectorAll('.document-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-doc')) return;
                loadDocument(item.dataset.id);
            });
        });
        
        elements.documentList.querySelectorAll('.delete-doc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteModal(btn.dataset.id);
            });
        });
    }

    // ==================== Auto Save ====================
    function initAutoSave() {
        // Auto save every 5 seconds if there are changes
        setInterval(() => {
            if (state.hasUnsavedChanges) {
                saveCurrentDocument();
            }
        }, 5000);
        
        // Mark as unsaved on input
        elements.editor.addEventListener('input', () => {
            state.hasUnsavedChanges = true;
            updateSaveStatus('saving');
            updateStats();
            updateHighlight();
        });
        
        // Save on title change
        elements.docTitleInput.addEventListener('input', () => {
            state.hasUnsavedChanges = true;
            updateSaveStatus('saving');
        });
    }

    function updateSaveStatus(status) {
        const indicator = elements.autoSaveStatus.querySelector('.save-indicator');
        const text = elements.autoSaveStatus.querySelector('.save-text');
        
        indicator.className = 'save-indicator';
        
        switch(status) {
            case 'saved':
                text.textContent = i18n[state.currentLang].saved;
                break;
            case 'saving':
                indicator.classList.add('saving');
                text.textContent = i18n[state.currentLang].saving;
                break;
            case 'unsaved':
                indicator.classList.add('unsaved');
                text.textContent = i18n[state.currentLang].unsaved;
                break;
        }
    }

    // ==================== Statistics ====================
    function updateStats() {
        const text = elements.editor.value;
        const words = countWords(text, state.currentLang);
        const chars = countChars(text);
        const paragraphs = countParagraphs(text);
        const readingMinutes = calculateReadingTime(
            ['zh', 'ja', 'ko'].includes(state.currentLang) ? chars : words,
            state.currentLang
        );
        
        elements.wordCount.textContent = words.toLocaleString();
        elements.charCount.textContent = chars.toLocaleString();
        elements.paragraphCount.textContent = paragraphs.toLocaleString();
        elements.readingTime.textContent = readingMinutes;
        
        updateProgress(words, chars);
    }

    function updateProgress(words, chars) {
        const current = state.goalType === 'words' ? words : chars;
        const percentage = Math.min(100, Math.round((current / state.goalValue) * 100));
        const remaining = Math.max(0, state.goalValue - current);
        
        elements.progressFill.style.width = percentage + '%';
        elements.progressText.textContent = percentage + '%';
        elements.progressCurrent.textContent = current;
        elements.progressTarget.textContent = state.goalValue;
        
        // Update goal chart
        updateGoalChart(current, state.goalValue);
        
        if (percentage >= 100) {
            elements.progressFill.classList.add('complete');
            elements.progressText.classList.add('complete');
            elements.remainingText.textContent = i18n[state.currentLang].goal + ' ✓';
            elements.estimateText.textContent = '';
        } else {
            elements.progressFill.classList.remove('complete');
            elements.progressText.classList.remove('complete');
            elements.remainingText.textContent = `${i18n[state.currentLang].remaining} ${remaining} ${i18n[state.currentLang][state.goalType]}`;
            
            const estimateMinutes = Math.ceil(remaining / 20); // Assuming 20 chars/min
            elements.estimateText.textContent = `${i18n[state.currentLang].estimate} ${estimateMinutes} min`;
        }
    }

    // ==================== Syntax Highlighting ====================
    function updateHighlight() {
        const text = elements.editor.value;
        if (!text) {
            elements.highlightLayer.innerHTML = '';
            return;
        }
        
        // Simple Markdown highlighting
        let highlighted = escapeHtml(text)
            // Headers
            .replace(/^(#{1,6}\s+.+)$/gm, '<span class="md-heading">$1</span>')
            // Bold
            .replace(/(\*\*|__)(.+?)\1/g, '<span class="md-bold">$1$2$1</span>')
            // Italic
            .replace(/(\*|_)([^\*_]+)\1/g, '<span class="md-italic">$1$2$1</span>')
            // Inline code
            .replace(/(`[^`]+`)/g, '<span class="md-code">$1</span>')
            // Links
            .replace(/(\[.+?\]\(.+?\))/g, '<span class="md-link">$1</span>')
            // List items
            .replace(/^(\s*[-*+]\s+)/gm, '<span class="md-list">$1</span>');
        
        elements.highlightLayer.innerHTML = highlighted;
        
        // Sync scroll
        elements.highlightLayer.scrollTop = elements.editor.scrollTop;
    }

    // ==================== Charts ====================
    function initCharts() {
        // Goal chart (donut)
        const goalCtx = document.getElementById('goalChart')?.getContext('2d');
        if (goalCtx) {
            state.chartInstances.goal = new Chart(goalCtx, {
                type: 'doughnut',
                data: {
                    labels: ['已完成', '剩余'],
                    datasets: [{
                        data: [0, 100],
                        backgroundColor: ['#525252', '#e8e8e8'],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
        }
        
        // Trend chart (line)
        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
            state.chartInstances.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '字数',
                        data: [],
                        borderColor: '#525252',
                        backgroundColor: 'rgba(82, 82, 82, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#525252'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 11 } }
                        },
                        y: {
                            grid: { color: '#e8e8e8' },
                            ticks: { font: { size: 11 } }
                        }
                    }
                }
            });
        }
    }

    function updateGoalChart(current, target) {
        const chart = state.chartInstances.goal;
        if (!chart) return;
        
        const completed = Math.min(current, target);
        const remaining = Math.max(0, target - current);
        
        chart.data.datasets[0].data = [completed, remaining];
        chart.data.datasets[0].backgroundColor = [
            completed >= target ? '#22c55e' : '#525252',
            '#e8e8e8'
        ];
        chart.update('none');
    }

    function updateTrendChart() {
        const chart = state.chartInstances.trend;
        if (!chart) return;
        
        const doc = state.documents.find(d => d.id === state.currentDocId);
        if (!doc || !doc.history || doc.history.length === 0) {
            // Generate some sample data if no history
            chart.data.labels = ['Start'];
            chart.data.datasets[0].data = [0];
            chart.update();
            return;
        }
        
        const labels = doc.history.map((h, i) => {
            if (i === 0) return 'Start';
            if (i === doc.history.length - 1) return 'Now';
            return '';
        });
        
        chart.data.labels = labels;
        chart.data.datasets[0].data = doc.history.map(h => h.words);
        chart.update();
    }

    // ==================== Writing Timer ====================
    function initWritingTimer() {
        state.writingStartTime = Date.now();
        
        setInterval(() => {
            state.writingTimeSeconds++;
            elements.writingTime.textContent = formatTime(state.writingTimeSeconds);
            
            // Auto save every minute
            if (state.writingTimeSeconds % 60 === 0 && state.hasUnsavedChanges) {
                saveCurrentDocument();
            }
        }, 1000);
    }

    // ==================== Focus Mode ====================
    function toggleFocusMode() {
        state.isFocusMode = !state.isFocusMode;
        document.body.classList.toggle('focus-mode', state.isFocusMode);
        elements.focusModeBtn.classList.toggle('active', state.isFocusMode);
        
        showToast(state.isFocusMode ? i18n[state.currentLang].focusMode : i18n[state.currentLang].normalMode);
        
        // Exit fullscreen with ESC
        if (state.isFocusMode) {
            const exitOnEsc = (e) => {
                if (e.key === 'Escape') {
                    toggleFocusMode();
                    document.removeEventListener('keydown', exitOnEsc);
                }
            };
            document.addEventListener('keydown', exitOnEsc);
        }
    }

    // ==================== Export ====================
    function exportDocument(format) {
        const doc = state.documents.find(d => d.id === state.currentDocId);
        if (!doc) return;
        
        const title = doc.title || i18n[state.currentLang].untitled;
        const content = doc.content;
        
        let blob, filename;
        
        if (format === 'txt') {
            blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            filename = `${title}.txt`;
        } else if (format === 'md') {
            const mdContent = `# ${title}\n\n${content}`;
            blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
            filename = `${title}.md`;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`${i18n[state.currentLang].exported}: ${filename}`);
    }

    // ==================== UI Helpers ====================
    function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2500);
    }

    function showDeleteModal(id) {
        elements.confirmDelete.dataset.id = id;
        elements.deleteModal.classList.add('show');
    }

    function hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    function toggleGoalPanel() {
        state.isGoalPanelOpen = !state.isGoalPanelOpen;
        elements.goalPanel.classList.toggle('open', state.isGoalPanelOpen);
        elements.goalToggle.classList.toggle('active', state.isGoalPanelOpen);
        localStorage.setItem('wc-goal-open', state.isGoalPanelOpen);
    }

    function updateGoal() {
        state.goalValue = parseInt(elements.goalInput.value) || 500;
        state.goalType = elements.goalType.value;
        localStorage.setItem('wc-goal-value', state.goalValue);
        localStorage.setItem('wc-goal-type', state.goalType);
        updateStats();
    }

    function updateLanguage(lang) {
        state.currentLang = lang;
        const t = i18n[lang];
        
        // Update all i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.textContent = t[key];
        });
        
        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) el.placeholder = t[key];
        });
        
        // Update select options
        const wordOption = elements.goalType.querySelector('option[value="words"]');
        const charOption = elements.goalType.querySelector('option[value="chars"]');
        if (wordOption) wordOption.textContent = t.words;
        if (charOption) charOption.textContent = t.chars;
        
        // Update language buttons
        elements.langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Update document title
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        
        // Recalculate stats
        updateStats();
        renderDocumentList();
        
        localStorage.setItem('wc-language', lang);
    }

    // ==================== Event Listeners ====================
    function initEventListeners() {
        // Sidebar toggle
        elements.sidebarToggle.addEventListener('click', () => {
            elements.sidebar.classList.add('collapsed');
            localStorage.setItem('wc-sidebar-collapsed', 'true');
        });
        
        elements.sidebarShowBtn.addEventListener('click', () => {
            elements.sidebar.classList.remove('collapsed');
            elements.sidebar.classList.add('show');
            localStorage.setItem('wc-sidebar-collapsed', 'false');
        });
        
        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!elements.sidebar.contains(e.target) && !elements.sidebarShowBtn.contains(e.target)) {
                    elements.sidebar.classList.remove('show');
                }
            }
        });
        
        // New document
        elements.newDocBtn.addEventListener('click', createNewDocument);
        
        // Goal toggle
        elements.goalToggle.addEventListener('click', toggleGoalPanel);
        
        // Goal settings
        elements.goalInput.addEventListener('input', updateGoal);
        elements.goalType.addEventListener('change', updateGoal);
        
        // Focus mode
        elements.focusModeBtn.addEventListener('click', toggleFocusMode);
        
        // Export
        elements.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.exportMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                elements.exportMenu.classList.remove('show');
            }
        });
        
        elements.exportMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                exportDocument(item.dataset.format);
                elements.exportMenu.classList.remove('show');
            });
        });
        
        // Stats modal
        elements.statsBtn.addEventListener('click', () => {
            updateStatsModal();
            updateTrendChart();
            elements.statsModal.classList.add('show');
        });
        
        elements.closeStatsModal.addEventListener('click', () => {
            hideModal('statsModal');
        });
        
        elements.statsModal.querySelector('.modal-overlay').addEventListener('click', () => {
            hideModal('statsModal');
        });
        
        // Delete modal
        elements.cancelDelete.addEventListener('click', () => hideModal('deleteModal'));
        elements.confirmDelete.addEventListener('click', () => {
            deleteDocument(elements.confirmDelete.dataset.id);
        });
        elements.deleteModal.querySelector('.modal-overlay').addEventListener('click', () => {
            hideModal('deleteModal');
        });
        
        // Language
        elements.langBtns.forEach(btn => {
            btn.addEventListener('click', () => updateLanguage(btn.dataset.lang));
        });
        
        // Editor scroll sync
        elements.editor.addEventListener('scroll', () => {
            elements.highlightLayer.scrollTop = elements.editor.scrollTop;
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // F11 - Focus mode
            if (e.key === 'F11') {
                e.preventDefault();
                toggleFocusMode();
            }
            
            // Ctrl/Cmd + S - Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveCurrentDocument();
                showToast(i18n[state.currentLang].saved);
            }
            
            // Ctrl/Cmd + N - New document
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                createNewDocument();
            }
            
            // ESC - Close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(modal => {
                    modal.classList.remove('show');
                });
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', (e) => {
            if (state.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    function updateStatsModal() {
        const text = elements.editor.value;
        const words = countWords(text, state.currentLang);
        const chars = countChars(text);
        
        elements.totalWords.textContent = words.toLocaleString();
        elements.totalChars.textContent = chars.toLocaleString();
        elements.totalTime.textContent = formatTime(state.writingTimeSeconds);
        
        const speed = state.writingTimeSeconds > 0 
            ? Math.round((words / state.writingTimeSeconds) * 60) 
            : 0;
        elements.avgSpeed.textContent = speed;
    }

    // ==================== Load Settings ====================
    function loadSettings() {
        // Language
        const savedLang = localStorage.getItem('wc-language');
        if (savedLang && i18n[savedLang]) {
            updateLanguage(savedLang);
        }
        
        // Goal settings
        const savedGoalValue = localStorage.getItem('wc-goal-value');
        const savedGoalType = localStorage.getItem('wc-goal-type');
        const savedGoalOpen = localStorage.getItem('wc-goal-open');
        
        if (savedGoalValue) {
            state.goalValue = parseInt(savedGoalValue);
            elements.goalInput.value = state.goalValue;
        }
        if (savedGoalType) {
            state.goalType = savedGoalType;
            elements.goalType.value = state.goalType;
        }
        if (savedGoalOpen === 'true') {
            state.isGoalPanelOpen = true;
            elements.goalPanel.classList.add('open');
            elements.goalToggle.classList.add('active');
        }
        
        // Sidebar
        const sidebarCollapsed = localStorage.getItem('wc-sidebar-collapsed');
        if (sidebarCollapsed === 'true') {
            elements.sidebar.classList.add('collapsed');
        }
    }

    // ==================== Initialize ====================
    function init() {
        loadSettings();
        loadDocuments();
        initEventListeners();
        initAutoSave();
        initWritingTimer();
        
        // Initialize charts after a slight delay to ensure canvas is ready
        setTimeout(initCharts, 100);
        
        // Focus editor
        elements.editor.focus();
        
        console.log('WordCounter Pro initialized');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
