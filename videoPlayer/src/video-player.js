// VideoPlayer Class
class VideoPlayer {
    constructor(config = {}) {
        this.config = {
            dimensions: {
                width: '100%',
                height: '100%',
                minWidth: 300,
                minHeight: 150,
                ...(config.dimensions || {})
            },
            controls: {
                showFullscreen: true,
                showQuality: true,
                showSubtitles: false,
                showVolume: true,
                showTime: true,
                ...(config.controls || {})
            },
            videoQualities: config.videoQualities || [{
                name: 'Source',
                src: '',
                poster: ''
            }],
            subtitleOptions: config.subtitleOptions || [
                { code: 'none', label: 'Sin subtítulos' }
            ],
            behavior: {
                autoplay: false,
                loop: false,
                defaultQuality: 'lowest',
                showControlsOnInit: true,
                hideControlsDelay: 3000,
                ...(config.behavior || {})
            }
        };

        this.elements = {};
        this.mouseMoveTimeout = null;
        this.init();
    }

    // Métodos de utilidad
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    getLowestQuality() {
        const sorted = [...this.config.videoQualities].sort((a, b) => {
            const numA = parseInt(a.name);
            const numB = parseInt(b.name);
            return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
        });
        return sorted[sorted.length - 1];
    }

    getQuality(type) {
        switch (type) {
            case 'highest': return this.config.videoQualities[0];
            case '720p':
                return this.config.videoQualities.find(q => q.name.includes('720p')) || this.getLowestQuality();
            case 'lowest':
            default:
                return this.getLowestQuality();
        }
    }

    // Control de reproducción
    togglePlayPause() {
        if (this.elements.video.paused) {
            this.elements.video.play()
                .then(() => {
                    this.elements.playPauseBtn.classList.replace('fa-play', 'fa-pause');
                    this.showControls();
                    this.resetHideControlsTimeout();
                })
                .catch(e => console.error('Error al reproducir:', e));
        } else {
            this.elements.video.pause();
            this.elements.playPauseBtn.classList.replace('fa-pause', 'fa-play');
            this.showControls();
            clearTimeout(this.mouseMoveTimeout);
        }
    }

    toggleMute() {
        this.elements.video.muted = !this.elements.video.muted;
        this.elements.muteBtn.classList.toggle('fa-volume-up');
        this.elements.muteBtn.classList.toggle('fa-volume-mute');
        this.resetHideControlsTimeout();
    }

    skip(seconds) {
        this.elements.video.currentTime = Math.max(0, Math.min(
            this.elements.video.duration,
            this.elements.video.currentTime + seconds
        ));
        this.resetHideControlsTimeout();
    }

    seek(e) {
        if (!isNaN(this.elements.video.duration)) {
            const rect = this.elements.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            this.elements.video.currentTime = pos * this.elements.video.duration;
            this.resetHideControlsTimeout();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.elements.container.requestFullscreen()
                .catch(err => console.error('Error en pantalla completa:', err));
        } else {
            document.exitFullscreen();
        }
        this.resetHideControlsTimeout();
    }

    // Control de UI
    showControls() {
        this.elements.controls.classList.add('show-controls');
        this.elements.topBar.classList.add('show-controls');
    }

    hideControls() {
        this.elements.controls.classList.remove('show-controls');
        this.elements.topBar.classList.remove('show-controls');
        this.elements.settingsMenu.classList.remove('show-settings');
    }

    resetHideControlsTimeout() {
        clearTimeout(this.mouseMoveTimeout);
        this.mouseMoveTimeout = setTimeout(() => this.hideControls(), this.config.behavior.hideControlsDelay);
    }

    showSettings(e) {
        e.stopPropagation();
        this.elements.settingsMenu.classList.toggle('show-settings');
        this.showControls();
        this.resetHideControlsTimeout();
    }

    hideSettings() {
        this.elements.settingsMenu.classList.remove('show-settings');
    }

    updateProgress() {
        if (!isNaN(this.elements.video.duration)) {
            const progressPercent = (this.elements.video.currentTime / this.elements.video.duration) * 100;
            this.elements.progress.style.width = `${progressPercent}%`;
            this.elements.currentTimeElem.textContent = this.formatTime(this.elements.video.currentTime);
        }
    }

    loadQualityOptions() {
        this.elements.qualityList.innerHTML = '';
        this.config.videoQualities.forEach(qualityItem => {
            const li = document.createElement('li');
            li.textContent = qualityItem.name;
            li.dataset.quality = qualityItem.name.toLowerCase();
            li.addEventListener('click', () => this.changeQuality(qualityItem));
            this.elements.qualityList.appendChild(li);
        });
    }

    loadSubtitleOptions() {
        this.elements.subtitleList.innerHTML = '';
        this.config.subtitleOptions.forEach(subtitle => {
            const li = document.createElement('li');
            li.textContent = subtitle.label;
            li.dataset.subtitle = subtitle.code;
            li.addEventListener('click', () => this.changeSubtitle(subtitle));
            this.elements.subtitleList.appendChild(li);
        });
    }

    // Control de calidad
    changeQuality(qualityItem) {
        if (this.elements.video.src !== qualityItem.src) {
            const wasPlaying = !this.elements.video.paused;
            const currentTime = this.elements.video.currentTime;

            if (wasPlaying) {
                this.elements.video.dataset.shouldPlay = 'true';
            }

            this.elements.video.src = qualityItem.src;
            this.elements.video.poster = qualityItem.poster;
            this.elements.video.currentTime = currentTime;

            this.elements.video.load();
            this.hideSettings();
            this.resetHideControlsTimeout();
        }
    }

    // Control de subtítulos
    initSubtitles() {
        this.config.subtitleOptions.forEach(subtitle => {
            if (subtitle.code !== 'none' && subtitle.src) {
                const track = document.createElement('track');
                track.kind = 'subtitles';
                track.label = subtitle.label;
                track.srclang = subtitle.code;
                track.src = subtitle.src;
                this.elements.video.appendChild(track);
            }
        });
    }

    changeSubtitle(subtitle) {
        const tracks = this.elements.video.textTracks;
        for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = 'hidden';
        }

        if (subtitle.code !== 'none') {
            const selectedTrack = Array.from(tracks).find(t => t.language === subtitle.code);
            if (selectedTrack) selectedTrack.mode = 'showing';
        }

        this.hideSettings();
        this.resetHideControlsTimeout();
    }

    // Configuración inicial
    setupVideoEvents() {
        this.elements.video.addEventListener('loadedmetadata', () => {
            this.elements.durationElem.textContent = this.formatTime(this.elements.video.duration);
        });

        this.elements.video.addEventListener('timeupdate', () => this.updateProgress());

        this.elements.video.addEventListener('canplay', () => {
            if (this.elements.video.dataset.shouldPlay === 'true') {
                this.elements.video.play()
                    .then(() => {
                        this.elements.playPauseBtn.classList.replace('fa-play', 'fa-pause');
                        delete this.elements.video.dataset.shouldPlay;
                    })
                    .catch(e => console.error('Error al reanudar:', e));
            }
        });
    }

    setupControls() {
        // Eventos de botones
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.video.addEventListener('click', (e) => {
            if (e.target === this.elements.video) {
                this.togglePlayPause();
                this.showControls();
                this.resetHideControlsTimeout();
            }
        });

        this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
        this.elements.progressBar.addEventListener('click', (e) => this.seek(e));
        this.elements.expandBtn.addEventListener('click', () => this.toggleFullscreen());
        this.elements.backBtn.addEventListener('click', () => this.skip(-10));
        this.elements.forwardBtn.addEventListener('click', () => this.skip(10));

        // Menú de configuración
        this.elements.settingsBtn.addEventListener('click', (e) => this.showSettings(e));
        document.addEventListener('click', () => this.hideSettings());
        this.elements.settingsMenu.addEventListener('click', e => e.stopPropagation());

        // Movimiento del ratón
        document.addEventListener('mousemove', () => {
            this.showControls();
            this.resetHideControlsTimeout();
        });
    }

    applyConfig() {
        // Dimensiones
        if (this.config.dimensions) {
            const d = this.config.dimensions;
            if (d.width) this.elements.container.style.width = d.width;
            if (d.height) this.elements.container.style.height = d.height;
            if (d.minWidth) this.elements.container.style.minWidth = `${d.minWidth}px`;
            if (d.minHeight) this.elements.container.style.minHeight = `${d.minHeight}px`;
        }

        // Mostrar/ocultar controles
        this.elements.expandBtn.style.display = this.config.controls.showFullscreen ? 'inline-block' : 'none';

        // Configuración de calidad inicial
        const defaultQuality = this.getQuality(this.config.behavior.defaultQuality);
        if (defaultQuality) {
            this.elements.video.src = defaultQuality.src;
            this.elements.video.poster = defaultQuality.poster;

            this.elements.video.addEventListener('error', () => {
                console.error('Error al cargar calidad por defecto, intentando con alternativa...');
                const fallback = this.getLowestQuality();
                if (fallback && fallback !== defaultQuality) {
                    this.elements.video.src = fallback.src;
                    this.elements.video.poster = fallback.poster;
                    this.elements.video.load();
                }
            });
        }

        // Autoplay y loop
        if (this.config.behavior.autoplay) this.elements.video.setAttribute('autoplay', '');
        if (this.config.behavior.loop) this.elements.video.setAttribute('loop', '');
    }

    createDOM() {
        // Crear la estructura HTML del reproductor
        const container = document.createElement('div');
        container.className = 'container';

        const topBar = document.createElement('div');
        topBar.className = 'top-bar';

        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'video-wrapper';

        // Usar el video existente o crear uno nuevo
        const video = document.getElementById('video') || document.createElement('video');
        video.className = 'video';
        video.id = 'video';

        const controls = document.createElement('div');
        controls.className = 'controls';

        // Barra de progreso
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.id = 'progress-bar';

        const progress = document.createElement('div');
        progress.className = 'progress';
        progress.id = 'progress';

        progressBar.appendChild(progress);
        progressContainer.appendChild(progressBar);

        // Controles
        const controlsLeft = document.createElement('div');
        controlsLeft.className = 'controls-left';

        const playPauseBtn = document.createElement('i');
        playPauseBtn.className = 'fas fa-play';
        playPauseBtn.id = 'play-pause';

        const backBtn = document.createElement('i');
        backBtn.className = 'fas fa-step-backward';

        const forwardBtn = document.createElement('i');
        forwardBtn.className = 'fas fa-step-forward';

        const muteBtn = document.createElement('i');
        muteBtn.className = 'fas fa-volume-up';
        muteBtn.id = 'mute';

        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'time-display';
        timeDisplay.innerHTML = '<span id="current-time">0:00</span> / <span id="duration">0:00</span>';

        controlsLeft.appendChild(backBtn);
        controlsLeft.appendChild(playPauseBtn);
        controlsLeft.appendChild(forwardBtn);
        controlsLeft.appendChild(muteBtn);
        controlsLeft.appendChild(timeDisplay);

        // Controles derecho
        const controlsRight = document.createElement('div');
        controlsRight.className = 'controls-right';

        const settingsBtn = document.createElement('i');
        settingsBtn.className = 'fas fa-cog';

        const expandBtn = document.createElement('i');
        expandBtn.className = 'fas fa-expand';

        controlsRight.appendChild(settingsBtn);
        controlsRight.appendChild(expandBtn);

        // Menú de configuración
        const settingsMenu = document.createElement('div');
        settingsMenu.className = 'settings-menu';
        settingsMenu.id = 'settings-menu';

        const qualityList = document.createElement('ul');
        qualityList.id = 'quality-list';
        qualityList.innerHTML = '<li class="settings-title">Calidad</li>';

        const subtitleList = document.createElement('ul');
        subtitleList.id = 'subtitle-list';
        subtitleList.innerHTML = '<li class="settings-title">Subtítulos</li>';

        settingsMenu.appendChild(qualityList);
        settingsMenu.appendChild(subtitleList);

        // Ensamblar todo
        controls.appendChild(progressContainer);
        controls.appendChild(controlsLeft);
        controls.appendChild(controlsRight);
        controls.appendChild(settingsMenu);

        videoWrapper.appendChild(video);

        container.appendChild(topBar);
        container.appendChild(videoWrapper);
        container.appendChild(controls);

        // Si no existe un contenedor, añadirlo al body
        if (!video.parentElement) {
            document.body.appendChild(container);
        } else {
            video.parentElement.replaceChild(container, video);
            container.querySelector('.video-wrapper').appendChild(video);
        }

        // Guardar referencias a los elementos
        this.elements = {
            video,
            playPauseBtn,
            muteBtn,
            progress,
            progressBar,
            currentTimeElem: document.getElementById('current-time'),
            durationElem: document.getElementById('duration'),
            settingsBtn,
            settingsMenu,
            qualityList,
            subtitleList,
            expandBtn,
            backBtn,
            forwardBtn,
            controls,
            topBar,
            container
        };
    }

    init() {
        this.createDOM();
        this.applyConfig();
        this.setupVideoEvents();
        this.setupControls();
        this.loadQualityOptions();
        this.loadSubtitleOptions();
        this.initSubtitles();

        if (this.config.behavior.showControlsOnInit) {
            this.showControls();
        }
    }
}

// Hacerlo disponible globalmente
window.VideoPlayer = VideoPlayer;