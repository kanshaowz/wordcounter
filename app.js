// WordCounter Application
(function() {
    'use strict';

    // Translations
    const i18n = {
        zh: {
            words: '字',
            chars: '字符',
            paragraphs: '段落',
            readingTime: '分钟阅读',
            goal: '目标',
            setGoal: '设置写作目标',
            startWriting: '开始写作...'
        },
        en: {
            words: 'words',
            chars: 'chars',
            paragraphs: 'paragraphs',
            readingTime: 'min read',
            goal: 'Goal',
            setGoal: 'Set Writing Goal',
            startWriting: 'Start writing...'
        },
        es: {
            words: 'palabras',
            chars: 'caracteres',
            paragraphs: 'párrafos',
            readingTime: 'min lectura',
            goal: 'Meta',
            setGoal: 'Establecer Meta',
            startWriting: 'Empieza a escribir...'
        },
        ja: {
            words: '文字',
            chars: '文字数',
            paragraphs: '段落',
            readingTime: '分読む',
            goal: '目標',
            setGoal: '目標を設定',
            startWriting: '書き始め...'
        },
        ko: {
            words: '단어',
            chars: '글자',
            paragraphs: '문단',
            readingTime: '분 읽기',
            goal: '목표',
            setGoal: '목표 설정',
            startWriting: '글쓰기 시작...'
        }
    };

    // Current state
    let currentLang = 'zh';
    let goalValue = 500;
    let goalType = 'words';

    // DOM Elements
    const elements = {
        editor: document.getElementById('editor'),
        wordCount: document.getElementById('wordCount'),
        charCount: document.getElementById('charCount'),
        paragraphCount: document.getElementById('paragraphCount'),
        readingTime: document.getElementById('readingTime'),
        goalPanel: document.getElementById('goalPanel'),
        goalToggle: document.getElementById('goalToggle'),
        goalInput: document.getElementById('goalInput'),
        goalType: document.getElementById('goalType'),
        progressFill: document.getElementById('progressFill'),
        progressText: document.getElementById('progressText'),
        langBtns: document.querySelectorAll('.lang-btn')
    };

    // Count functions for different languages
    function countWords(text, lang) {
        if (!text.trim()) return 0;
        
        switch(lang) {
            case 'zh':
            case 'ja':
            case 'ko':
                // For CJK languages, count characters (excluding spaces and punctuation)
                return text.replace(/\s/g, '').replace(/[，。！？、；：""''（）【】]/g, '').length;
            default:
                // For Latin languages, count word-like sequences
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
                wpm = 400; // Characters per minute for CJK
                break;
            default:
                wpm = 200; // Words per minute for Latin languages
        }
        return Math.max(1, Math.ceil(wordCount / wpm));
    }

    // Update statistics
    function updateStats() {
        const text = elements.editor.value;
        const words = countWords(text, currentLang);
        const chars = countChars(text);
        const paragraphs = countParagraphs(text);
        const readingMinutes = calculateReadingTime(
            ['zh', 'ja', 'ko'].includes(currentLang) ? chars : words, 
            currentLang
        );

        elements.wordCount.textContent = words.toLocaleString();
        elements.charCount.textContent = chars.toLocaleString();
        elements.paragraphCount.textContent = paragraphs.toLocaleString();
        elements.readingTime.textContent = readingMinutes;

        updateProgress(words, chars);
    }

    // Update progress bar
    function updateProgress(words, chars) {
        const current = goalType === 'words' ? words : chars;
        const percentage = Math.min(100, Math.round((current / goalValue) * 100));
        
        elements.progressFill.style.width = percentage + '%';
        elements.progressText.textContent = percentage + '%';
        
        if (percentage >= 100) {
            elements.progressFill.classList.add('complete');
            elements.progressText.classList.add('complete');
        } else {
            elements.progressFill.classList.remove('complete');
            elements.progressText.classList.remove('complete');
        }
    }

    // Update UI language
    function updateLanguage(lang) {
        currentLang = lang;
        const t = i18n[lang];

        // Update all i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.textContent = t[key];
        });

        // Update placeholder
        if (t.startWriting) {
            elements.editor.placeholder = t.startWriting;
        }

        // Update language buttons
        elements.langBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update select options
        const wordOption = elements.goalType.querySelector('option[value="words"]');
        const charOption = elements.goalType.querySelector('option[value="chars"]');
        if (wordOption) wordOption.textContent = t.words;
        if (charOption) charOption.textContent = t.chars;

        // Update document language
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 
                                        lang === 'ja' ? 'ja-JP' :
                                        lang === 'ko' ? 'ko-KR' :
                                        lang === 'es' ? 'es-ES' : 'en';

        // Update font based on language
        updateFont(lang);

        // Recalculate stats with new language rules
        updateStats();

        // Save preference
        localStorage.setItem('wc-language', lang);
    }

    // Update font for better CJK rendering
    function updateFont(lang) {
        const fonts = {
            zh: "'Inter', 'Noto Sans SC', sans-serif",
            ja: "'Inter', 'Noto Sans JP', sans-serif",
            ko: "'Inter', 'Noto Sans KR', sans-serif",
            en: "'Inter', sans-serif",
            es: "'Inter', sans-serif"
        };
        
        elements.editor.style.fontFamily = fonts[lang] || fonts.en;
    }

    // Toggle goal panel
    function toggleGoalPanel() {
        const isOpen = elements.goalPanel.classList.toggle('open');
        elements.goalToggle.classList.toggle('active', isOpen);
        localStorage.setItem('wc-goal-open', isOpen);
    }

    // Update goal settings
    function updateGoal() {
        goalValue = parseInt(elements.goalInput.value) || 500;
        goalType = elements.goalType.value;
        localStorage.setItem('wc-goal-value', goalValue);
        localStorage.setItem('wc-goal-type', goalType);
        updateStats();
    }

    // Load saved settings
    function loadSettings() {
        // Load language
        const savedLang = localStorage.getItem('wc-language');
        if (savedLang && i18n[savedLang]) {
            updateLanguage(savedLang);
        }

        // Load goal settings
        const savedGoalValue = localStorage.getItem('wc-goal-value');
        const savedGoalType = localStorage.getItem('wc-goal-type');
        const savedGoalOpen = localStorage.getItem('wc-goal-open');

        if (savedGoalValue) {
            goalValue = parseInt(savedGoalValue);
            elements.goalInput.value = goalValue;
        }
        if (savedGoalType) {
            goalType = savedGoalType;
            elements.goalType.value = goalType;
        }
        if (savedGoalOpen === 'true') {
            elements.goalPanel.classList.add('open');
            elements.goalToggle.classList.add('active');
        }
    }

    // Event listeners
    function initEventListeners() {
        // Editor input
        elements.editor.addEventListener('input', updateStats);

        // Language buttons
        elements.langBtns.forEach(btn => {
            btn.addEventListener('click', () => updateLanguage(btn.dataset.lang));
        });

        // Goal toggle
        elements.goalToggle.addEventListener('click', toggleGoalPanel);

        // Goal input
        elements.goalInput.addEventListener('input', updateGoal);
        elements.goalType.addEventListener('change', updateGoal);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + F for focus mode
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                document.body.classList.toggle('focus-mode');
            }
        });

        // Auto-resize on window resize
        window.addEventListener('resize', () => {
            // Layout handled by CSS
        });
    }

    // Initialize
    function init() {
        initEventListeners();
        loadSettings();
        updateStats();
        
        // Focus editor on load
        elements.editor.focus();
        
        console.log('WordCounter initialized');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
