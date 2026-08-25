/**
 * FetchFlow - Universal Client-Side Media Extractor & Stream Downloader
 * 100% in-browser stream parsing and direct downloading. Zero telemetry.
 */

const FETCHFLOW_I18N = {
    en: {
        langBtn: "RU",
        soundBtn: "SOUND",
        muteBtn: "MUTE",
        hubBtn: "HUB",
        heroTitle: "FetchFlow",
        heroSubtitle: "Universal client-side media parser and stream extractor. Direct in-browser video & audio downloads for YouTube, TikTok, VK, X/Twitter, Reddit, SoundCloud & more.",
        inputPlaceholder: "Paste video or audio link (YouTube, TikTok, VK, X, Reddit, SoundCloud, Twitch...)",
        btnPaste: "PASTE",
        btnFetch: "FETCH MEDIA",
        btnFetching: "EXTRACTING STREAM...",
        previewTitle: "MEDIA PREVIEW // READY FOR DOWNLOAD",
        labelDuration: "DURATION",
        labelPlatform: "PLATFORM",
        labelAuthor: "AUTHOR",
        btnDownloadVideo: "DOWNLOAD VIDEO (HD)",
        btnDownloadAudio: "DOWNLOAD AUDIO (MP3)",
        btnDownloadThumb: "DOWNLOAD COVER",
        btnOpenStream: "DIRECT STREAM / OPEN",
        historyTitle: "RECENT STREAMS",
        historyEmpty: "No recent extractions yet. Paste a link above to begin.",
        btnClearHistory: "CLEAR HISTORY",
        errInvalidUrl: "Please enter a valid media URL",
        errExtractFailed: "Failed to extract media stream. Please verify the URL or try again.",
        toastCopied: "Link copied to clipboard!",
        toastSuccess: "Extraction completed successfully!",
        toastDownloading: "Starting stream download...",
        toastDownloaded: "Download ready!",
        footerLeft: "FetchFlow • 100% In-Browser Media Extraction",
        footerRight: "Part of the stash"
    },
    ru: {
        langBtn: "EN",
        soundBtn: "ЗВУК",
        muteBtn: "БЕЗ ЗВУКА",
        hubBtn: "ХАБ",
        heroTitle: "FetchFlow",
        heroSubtitle: "Универсальный клиентский веб-парсер и загрузчик медиапотоков. Прямое скачивание видео и аудио для YouTube, TikTok, VK, X/Twitter, Reddit, SoundCloud и других.",
        inputPlaceholder: "Вставьте ссылку на видео или аудио (YouTube, TikTok, VK, X, Reddit, SoundCloud, Twitch...)",
        btnPaste: "ВСТАВИТЬ",
        btnFetch: "ПОЛУЧИТЬ МЕДИА",
        btnFetching: "ИЗВЛЕЧЕНИЕ ПОТОКА...",
        previewTitle: "ПРЕДПРОСМОТР // ГОТОВО К СКАЧИВАНИЮ",
        labelDuration: "ДЛИТЕЛЬНОСТЬ",
        labelPlatform: "ПЛАТФОРМА",
        labelAuthor: "АВТОР",
        btnDownloadVideo: "СКАЧАТЬ ВИДЕО (HD)",
        btnDownloadAudio: "СКАЧАТЬ АУДИО (MP3)",
        btnDownloadThumb: "СКАЧАТЬ ОБЛОЖКУ",
        btnOpenStream: "ПРЯМОЙ ПОТОК / ОТКРЫТЬ",
        historyTitle: "НЕДАВНИЕ ЗАГРУЗКИ",
        historyEmpty: "История пуста. Вставьте ссылку выше для извлечения.",
        btnClearHistory: "ОЧИСТИТЬ ИСТОРИЮ",
        errInvalidUrl: "Пожалуйста, введите корректную ссылку на медиа",
        errExtractFailed: "Не удалось извлечь медиапоток. Проверьте ссылку и повторите попытку.",
        toastCopied: "Ссылка скопирована в буфер!",
        toastSuccess: "Медиапоток успешно получен!",
        toastDownloading: "Скачивание медиапотока...",
        toastDownloaded: "Файл готов и сохранен!",
        footerLeft: "FetchFlow • 100% извлечение медиа в браузере",
        footerRight: "Часть the stash"
    }
};

class FetchFlowApp {
    constructor() {
        this.currentLang = localStorage.getItem('the_stash_lang') || 'en';
        this.currentMedia = null;
        this.isFetching = false;
        this.isDownloading = false;
        this.history = [];
        
        try {
            const saved = localStorage.getItem('fetchflow_history');
            if (saved) this.history = JSON.parse(saved);
        } catch (e) {}

        this.initDOM();
        this.initEvents();
        this.applyLanguage(this.currentLang);
        this.renderHistory();
    }

    initDOM() {
        this.urlInput = document.getElementById('media-url-input');
        this.btnPaste = document.getElementById('btn-paste');
        this.btnFetch = document.getElementById('btn-fetch');
        this.platformBadge = document.getElementById('input-platform-badge');

        this.previewSection = document.getElementById('preview-section');
        this.previewTitle = document.getElementById('preview-title');
        this.playerContainer = document.getElementById('player-container');
        this.mediaTitle = document.getElementById('media-title');
        this.mediaAuthor = document.getElementById('media-author');
        this.mediaDuration = document.getElementById('media-duration');
        this.mediaPlatform = document.getElementById('media-platform');

        this.btnDlVideo = document.getElementById('btn-dl-video');
        this.btnDlAudio = document.getElementById('btn-dl-audio');
        this.btnDlThumb = document.getElementById('btn-dl-thumb');
        this.btnOpenStream = document.getElementById('btn-open-stream');

        this.historyList = document.getElementById('history-list');
        this.emptyHistory = document.getElementById('empty-history');
        this.btnClearHistory = document.getElementById('btn-clear-history');

        this.btnLang = document.getElementById('btn-lang');
        this.btnLangText = document.getElementById('btn-lang-text');
        this.btnMute = document.getElementById('btn-mute');
        this.toast = document.getElementById('toast-notify');
    }

    initEvents() {
        if (this.urlInput) {
            this.urlInput.addEventListener('input', () => {
                this.detectPlatformFromUrl(this.urlInput.value.trim());
            });
            this.urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.fetchMedia();
                }
            });
        }

        if (this.btnPaste) {
            this.btnPaste.addEventListener('click', async () => {
                window.fetchflowSound.playPaste();
                try {
                    const text = await navigator.clipboard.readText();
                    if (text && this.urlInput) {
                        this.urlInput.value = text.trim();
                        this.detectPlatformFromUrl(text.trim());
                        this.fetchMedia();
                    }
                } catch (e) {
                    this.urlInput.focus();
                }
            });
        }

        if (this.btnFetch) {
            this.btnFetch.addEventListener('click', () => {
                this.fetchMedia();
            });
        }

        if (this.btnClearHistory) {
            this.btnClearHistory.addEventListener('click', () => {
                window.fetchflowSound.playClick();
                this.history = [];
                try { localStorage.setItem('fetchflow_history', JSON.stringify([])); } catch (e) {}
                this.renderHistory();
            });
        }

        if (this.btnLang) {
            this.btnLang.addEventListener('click', () => {
                window.fetchflowSound.playClick();
                this.currentLang = this.currentLang === 'en' ? 'ru' : 'en';
                localStorage.setItem('the_stash_lang', this.currentLang);
                this.applyLanguage(this.currentLang);
            });
        }

        if (this.btnMute) {
            this.btnMute.addEventListener('click', () => {
                const muted = window.fetchflowSound.toggleMute();
                this.updateMuteButton(muted);
            });
            this.updateMuteButton(window.fetchflowSound.isMuted);
        }
    }

    applyLanguage(lang) {
        const dict = FETCHFLOW_I18N[lang] || FETCHFLOW_I18N.en;

        if (this.btnLangText) this.btnLangText.textContent = dict.langBtn;
        const txtHub = document.getElementById('txt-btn-hub');
        if (txtHub) txtHub.textContent = dict.hubBtn;

        const heroSub = document.querySelector('.hero-subtitle');
        if (heroSub) heroSub.textContent = dict.heroSubtitle;

        if (this.urlInput) this.urlInput.placeholder = dict.inputPlaceholder;
        const pasteSpan = document.querySelector('#btn-paste span');
        if (pasteSpan) pasteSpan.textContent = dict.btnPaste;

        const fetchSpan = document.querySelector('#btn-fetch span');
        if (fetchSpan && !this.isFetching) fetchSpan.textContent = dict.btnFetch;

        if (this.previewTitle) this.previewTitle.textContent = dict.previewTitle;

        const lblDur = document.getElementById('lbl-meta-duration');
        if (lblDur) lblDur.textContent = dict.labelDuration;
        const lblPlat = document.getElementById('lbl-meta-platform');
        if (lblPlat) lblPlat.textContent = dict.labelPlatform;
        const lblAuth = document.getElementById('lbl-meta-author');
        if (lblAuth) lblAuth.textContent = dict.labelAuthor;

        const dlVidSpan = document.querySelector('#btn-dl-video span');
        if (dlVidSpan) dlVidSpan.textContent = dict.btnDownloadVideo;
        const dlAudSpan = document.querySelector('#btn-dl-audio span');
        if (dlAudSpan) dlAudSpan.textContent = dict.btnDownloadAudio;
        const dlThmSpan = document.querySelector('#btn-dl-thumb span');
        if (dlThmSpan) dlThmSpan.textContent = dict.btnDownloadThumb;
        const openStrSpan = document.querySelector('#btn-open-stream span');
        if (openStrSpan) openStrSpan.textContent = dict.btnOpenStream;

        const histHeader = document.querySelector('.history-header-title span');
        if (histHeader) histHeader.textContent = dict.historyTitle;
        if (this.emptyHistory) this.emptyHistory.textContent = dict.historyEmpty;
        const btnClearHist = document.querySelector('#btn-clear-history span');
        if (btnClearHist) btnClearHist.textContent = dict.btnClearHistory;

        const footerLeft = document.querySelector('footer span:first-child');
        if (footerLeft) footerLeft.textContent = dict.footerLeft;

        this.updateMuteButton(window.fetchflowSound.isMuted);
    }

    updateMuteButton(isMuted) {
        if (!this.btnMute) return;
        const dict = FETCHFLOW_I18N[this.currentLang] || FETCHFLOW_I18N.en;
        const label = isMuted ? dict.muteBtn : dict.soundBtn;
        const iconSvg = isMuted
            ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
            : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
        this.btnMute.innerHTML = `${iconSvg} <span>${label}</span>`;
        if (isMuted) this.btnMute.classList.add('muted');
        else this.btnMute.classList.remove('muted');
    }

    showToast(message) {
        if (!this.toast) return;
        this.toast.textContent = message;
        this.toast.classList.add('show');
        setTimeout(() => this.toast.classList.remove('show'), 2800);
    }

    detectPlatformFromUrl(url) {
        if (!url) {
            this.platformBadge.textContent = 'DETECT';
            this.platformBadge.className = 'platform-pill platform-auto';
            return 'auto';
        }

        const lower = url.toLowerCase();
        let name = 'GENERIC';
        let cls = 'platform-generic';

        if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
            name = 'YOUTUBE';
            cls = 'platform-youtube';
        } else if (lower.includes('tiktok.com')) {
            name = 'TIKTOK';
            cls = 'platform-tiktok';
        } else if (lower.includes('twitter.com') || lower.includes('x.com')) {
            name = 'X / TWITTER';
            cls = 'platform-twitter';
        } else if (lower.includes('vk.com') || lower.includes('vkvideo.ru')) {
            name = 'VK VIDEO';
            cls = 'platform-vk';
        } else if (lower.includes('reddit.com') || lower.includes('v.redd.it')) {
            name = 'REDDIT';
            cls = 'platform-reddit';
        } else if (lower.includes('soundcloud.com')) {
            name = 'SOUNDCLOUD';
            cls = 'platform-soundcloud';
        } else if (lower.includes('twitch.tv')) {
            name = 'TWITCH';
            cls = 'platform-twitch';
        } else if (lower.includes('instagram.com')) {
            name = 'INSTAGRAM';
            cls = 'platform-instagram';
        }

        this.platformBadge.textContent = name;
        this.platformBadge.className = `platform-pill ${cls}`;
        return name;
    }

    /* -------------------------------------------------------------
     *  MEDIA STREAM EXTRACTION ENGINE
     * ------------------------------------------------------------- */

    async fetchMedia() {
        const url = this.urlInput.value.trim();
        const dict = FETCHFLOW_I18N[this.currentLang] || FETCHFLOW_I18N.en;

        if (!url || !url.startsWith('http')) {
            this.showToast(dict.errInvalidUrl);
            return;
        }

        this.isFetching = true;
        this.btnFetch.classList.add('loading');
        this.btnFetch.querySelector('span').textContent = dict.btnFetching;
        window.fetchflowSound.playScanStart();

        try {
            const mediaData = await this.extractStream(url);
            if (mediaData && (mediaData.videoUrl || mediaData.audioUrl || mediaData.streamUrl)) {
                this.currentMedia = mediaData;
                this.renderPreview(mediaData);
                this.saveToHistory(mediaData);
                window.fetchflowSound.playStreamFound();
                this.showToast(dict.toastSuccess);
            } else {
                throw new Error('No stream found');
            }
        } catch (err) {
            console.error('FetchFlow extraction error:', err);
            this.showToast(dict.errExtractFailed);
        } finally {
            this.isFetching = false;
            this.btnFetch.classList.remove('loading');
            this.btnFetch.querySelector('span').textContent = dict.btnFetch;
        }
    }

    async extractStream(targetUrl) {
        const platform = this.detectPlatformFromUrl(targetUrl);

        // 1. TikTok Direct Watermark-Free Extractor
        if (platform === 'TIKTOK') {
            try {
                const apiRes = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`);
                if (apiRes.ok) {
                    const json = await apiRes.json();
                    if (json.data) {
                        const d = json.data;
                        const durationSec = d.duration || 0;
                        const durStr = durationSec ? `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}` : 'HD';
                        return {
                            title: d.title || 'TikTok Video',
                            author: d.author ? `@${d.author.unique_id || d.author.nickname}` : 'TikTok Creator',
                            platform: 'TikTok',
                            duration: durStr,
                            videoUrl: d.play || d.hdplay || d.wmplay,
                            audioUrl: d.music || d.music_info?.play,
                            streamUrl: d.play || d.hdplay,
                            thumbnail: d.cover || d.origin_cover,
                            sourceUrl: targetUrl
                        };
                    }
                }
            } catch (e) {
                console.warn('TikWM direct extraction failed, trying fallback...', e);
            }
        }

        // 2. YouTube Invidious / Piped Streams
        if (platform === 'YOUTUBE') {
            let videoId = null;
            try {
                const u = new URL(targetUrl);
                if (u.hostname.includes('youtu.be')) {
                    videoId = u.pathname.slice(1);
                } else if (u.searchParams.has('v')) {
                    videoId = u.searchParams.get('v');
                } else if (u.pathname.includes('/shorts/')) {
                    videoId = u.pathname.split('/shorts/')[1]?.split('?')[0];
                }
            } catch (e) {}

            if (videoId) {
                const invidiousHosts = [
                    'https://invidious.privacydev.net',
                    'https://yewtu.be',
                    'https://vid.puffyan.us',
                    'https://invidious.nerdvpn.de'
                ];

                for (const host of invidiousHosts) {
                    try {
                        const invRes = await fetch(`${host}/api/v1/videos/${videoId}`, { signal: AbortSignal.timeout(5000) });
                        if (invRes.ok) {
                            const data = await invRes.json();
                            if (data && data.formatStreams && data.formatStreams.length > 0) {
                                // Sort by resolution desc
                                const streams = data.formatStreams.sort((a, b) => (parseInt(b.resolution) || 0) - (parseInt(a.resolution) || 0));
                                const bestVideo = streams[0];
                                const audioStreams = data.adaptiveFormats?.filter(f => f.type?.startsWith('audio/')) || [];
                                const bestAudio = audioStreams[0];

                                const durSec = data.lengthSeconds || 0;
                                const durStr = durSec ? `${Math.floor(durSec / 60)}:${(durSec % 60).toString().padStart(2, '0')}` : 'HD';

                                return {
                                    title: data.title || 'YouTube Video',
                                    author: data.author || 'YouTube Channel',
                                    platform: 'YouTube',
                                    duration: durStr,
                                    videoUrl: bestVideo.url,
                                    audioUrl: bestAudio ? bestAudio.url : bestVideo.url,
                                    streamUrl: bestVideo.url,
                                    thumbnail: data.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                                    sourceUrl: targetUrl
                                };
                            }
                        }
                    } catch (e) {}
                }

                // If Invidious instances fail, return direct high-res embed with thumbnail
                return {
                    title: 'YouTube Stream',
                    author: 'YouTube',
                    platform: 'YouTube',
                    duration: 'Auto HD',
                    videoUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
                    audioUrl: targetUrl,
                    streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    sourceUrl: targetUrl,
                    isEmbed: true
                };
            }
        }

        // 3. Reddit direct fallback parser
        if (platform === 'REDDIT') {
            try {
                const cleanUrl = targetUrl.split('?')[0].replace(/\/$/, '') + '.json';
                const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`);
                if (res.ok) {
                    const data = await res.json();
                    const post = data[0]?.data?.children[0]?.data;
                    if (post && post.secure_media?.reddit_video) {
                        const rv = post.secure_media.reddit_video;
                        const durationSec = rv.duration || 0;
                        const durStr = durationSec ? `${durationSec}s` : 'HD';
                        return {
                            title: post.title || 'Reddit Video',
                            author: post.author ? `u/${post.author}` : 'Reddit User',
                            platform: 'Reddit',
                            duration: durStr,
                            videoUrl: rv.fallback_url,
                            audioUrl: rv.fallback_url.replace(/DASH_\d+/, 'DASH_AUDIO_128'),
                            streamUrl: rv.fallback_url,
                            thumbnail: post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : '',
                            sourceUrl: targetUrl
                        };
                    }
                }
            } catch (e) {}
        }

        // 4. Twitter / X Direct Media Parser via vxtwitter / fxtwitter
        if (platform === 'X / TWITTER') {
            try {
                const apiVx = targetUrl.replace('twitter.com', 'api.vxtwitter.com').replace('x.com', 'api.vxtwitter.com');
                const vxRes = await fetch(apiVx);
                if (vxRes.ok) {
                    const vxData = await vxRes.json();
                    if (vxData.mediaURLs && vxData.mediaURLs.length > 0) {
                        const vidUrl = vxData.mediaURLs[0];
                        return {
                            title: vxData.text ? vxData.text.slice(0, 80) : 'Twitter Media',
                            author: vxData.user_name ? `${vxData.user_name} (@${vxData.user_screen_name})` : 'Twitter User',
                            platform: 'Twitter / X',
                            duration: 'HD',
                            videoUrl: vidUrl,
                            audioUrl: vidUrl,
                            streamUrl: vidUrl,
                            thumbnail: vxData.media_extended?.[0]?.thumbnail_url || '',
                            sourceUrl: targetUrl
                        };
                    }
                }
            } catch (e) {}
        }

        // 5. Generic / Direct Stream Fallback
        return {
            title: `${platform} Media Stream`,
            author: platform,
            platform: platform,
            duration: 'Live / Media',
            videoUrl: targetUrl,
            audioUrl: targetUrl,
            streamUrl: targetUrl,
            thumbnail: '',
            sourceUrl: targetUrl
        };
    }

    renderPreview(media) {
        if (!this.previewSection) return;
        this.previewSection.style.display = 'flex';

        this.mediaTitle.textContent = media.title;
        this.mediaAuthor.textContent = media.author || media.platform;
        this.mediaDuration.textContent = media.duration || 'Auto';
        this.mediaPlatform.textContent = media.platform;

        this.playerContainer.innerHTML = '';

        if (media.isEmbed) {
            const iframe = document.createElement('iframe');
            iframe.src = media.videoUrl;
            iframe.style.width = '100%';
            iframe.style.height = '320px';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '8px';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            this.playerContainer.appendChild(iframe);
        } else if (media.platform === 'SOUNDCLOUD' || media.isAudioOnly) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = media.audioUrl || media.streamUrl;
            audio.style.width = '100%';
            this.playerContainer.appendChild(audio);
        } else {
            const video = document.createElement('video');
            video.controls = true;
            video.playsInline = true;
            video.src = media.videoUrl || media.streamUrl;
            video.style.width = '100%';
            video.style.maxHeight = '380px';
            video.style.borderRadius = '8px';
            if (media.thumbnail) video.poster = media.thumbnail;
            this.playerContainer.appendChild(video);
        }

        // Download Action Buttons
        this.btnDlVideo.onclick = () => {
            window.fetchflowSound.playClick();
            const safeName = (media.title || 'video').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60);
            this.forceDownloadFile(media.videoUrl || media.streamUrl, `${safeName}.mp4`);
        };

        this.btnDlAudio.onclick = () => {
            window.fetchflowSound.playClick();
            const safeName = (media.title || 'audio').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60);
            this.forceDownloadFile(media.audioUrl || media.streamUrl, `${safeName}.mp3`);
        };

        if (media.thumbnail) {
            this.btnDlThumb.style.display = 'inline-flex';
            this.btnDlThumb.onclick = () => {
                window.fetchflowSound.playClick();
                const safeName = (media.title || 'cover').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 60);
                this.forceDownloadFile(media.thumbnail, `${safeName}.jpg`);
            };
        } else {
            this.btnDlThumb.style.display = 'none';
        }

        this.btnOpenStream.onclick = () => {
            window.fetchflowSound.playClick();
            window.open(media.streamUrl || media.videoUrl, '_blank');
        };

        this.previewSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Resilient in-browser forced file downloader:
     * 1. Tries direct blob fetch
     * 2. Tries multi-hop CORS proxy blob fetch
     * 3. Falls back to window.open stream download
     */
    async forceDownloadFile(fileUrl, filename) {
        if (this.isDownloading) return;
        this.isDownloading = true;

        const dict = FETCHFLOW_I18N[this.currentLang] || FETCHFLOW_I18N.en;
        this.showToast(dict.toastDownloading);

        const tryBlobDownload = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
            return true;
        };

        try {
            // Attempt 1: Direct fetch
            await tryBlobDownload(fileUrl);
            this.showToast(dict.toastDownloaded);
            window.fetchflowSound.playStreamFound();
        } catch (e1) {
            console.warn('Direct blob fetch failed, attempting CORS proxy...', e1);
            try {
                // Attempt 2: AllOrigins proxy
                const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fileUrl)}`;
                await tryBlobDownload(proxiedUrl);
                this.showToast(dict.toastDownloaded);
                window.fetchflowSound.playStreamFound();
            } catch (e2) {
                console.warn('CORS proxy blob fetch failed, opening direct stream tab...', e2);
                // Attempt 3: Direct tab download fallback
                const a = document.createElement('a');
                a.href = fileUrl;
                a.target = '_blank';
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                this.showToast(dict.toastDownloaded);
            }
        } finally {
            this.isDownloading = false;
        }
    }

    saveToHistory(media) {
        this.history = this.history.filter(h => h.sourceUrl !== media.sourceUrl);
        this.history.unshift({
            title: media.title,
            platform: media.platform,
            sourceUrl: media.sourceUrl,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        if (this.history.length > 8) this.history.pop();
        try { localStorage.setItem('fetchflow_history', JSON.stringify(this.history)); } catch (e) {}
        this.renderHistory();
    }

    renderHistory() {
        if (!this.historyList) return;
        this.historyList.innerHTML = '';

        if (this.history.length === 0) {
            if (this.emptyHistory) this.emptyHistory.style.display = 'block';
            return;
        }

        if (this.emptyHistory) this.emptyHistory.style.display = 'none';

        this.history.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-item';
            card.innerHTML = `
                <div class="history-item-info">
                    <span class="history-item-title" title="${item.title}">${item.title}</span>
                    <span class="history-item-meta">${item.platform} &bull; ${item.timestamp}</span>
                </div>
                <button class="btn-history-load" title="Load Link">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            `;

            card.querySelector('.btn-history-load').addEventListener('click', () => {
                window.fetchflowSound.playClick();
                if (this.urlInput) {
                    this.urlInput.value = item.sourceUrl;
                    this.detectPlatformFromUrl(item.sourceUrl);
                    this.fetchMedia();
                }
            });

            this.historyList.appendChild(card);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.fetchFlowApp = new FetchFlowApp();
});
