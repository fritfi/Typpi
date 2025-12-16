class GlassSurface {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            width: '100%',
            height: '100%',
            borderRadius: 20,
            borderWidth: 0.07,
            brightness: 50,
            opacity: 0.93,
            blur: 11,
            displace: 0,
            backgroundOpacity: 0,
            saturation: 1,
            distortionScale: -180,
            redOffset: 0,
            greenOffset: 10,
            blueOffset: 20,
            xChannel: 'R',
            yChannel: 'G',
            mixBlendMode: 'difference',
            ...options
        };

        this.uniqueId = Math.random().toString(36).substr(2, 9);
        this.filterId = `glass-filter-${this.uniqueId}`;
        this.redGradId = `red-grad-${this.uniqueId}`;
        this.blueGradId = `blue-grad-${this.uniqueId}`;

        this.init();
    }

    init() {
        this.element.classList.add('glass-surface');

        if (this.supportsSVGFilters()) {
            this.element.classList.add('glass-surface--svg');
        } else {
            this.element.classList.add('glass-surface--fallback');
        }

        this.applyStyles();
        this.createSVGStructure();
        this.updateDisplacementMap();
        this.setupResizeObserver();
    }

    supportsSVGFilters() {
        const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
        const isFirefox = /Firefox/.test(navigator.userAgent);

        if (isWebkit || isFirefox) {
            return false;
        }

        const div = document.createElement('div');
        div.style.backdropFilter = `url(#${this.filterId})`;
        return div.style.backdropFilter !== '';
    }

    applyStyles() {
        const style = this.element.style;
        style.width = typeof this.options.width === 'number' ? `${this.options.width}px` : this.options.width;
        style.height = typeof this.options.height === 'number' ? `${this.options.height}px` : this.options.height;
        style.borderRadius = `${this.options.borderRadius}px`;
        style.setProperty('--glass-frost', this.options.backgroundOpacity);
        style.setProperty('--glass-saturation', this.options.saturation);
        style.setProperty('--filter-id', `url(#${this.filterId})`);
    }

    createSVGStructure() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "glass-surface__filter");

        svg.innerHTML = `
            <defs>
                <filter id="${this.filterId}" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">
                    <feImage id="feImage-${this.uniqueId}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

                    <feDisplacementMap id="redChannel-${this.uniqueId}" in="SourceGraphic" in2="map" result="dispRed" 
                        scale="${this.options.distortionScale + this.options.redOffset}" 
                        xChannelSelector="${this.options.xChannel}" 
                        yChannelSelector="${this.options.yChannel}"/>
                    <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />

                    <feDisplacementMap id="greenChannel-${this.uniqueId}" in="SourceGraphic" in2="map" result="dispGreen" 
                        scale="${this.options.distortionScale + this.options.greenOffset}" 
                        xChannelSelector="${this.options.xChannel}" 
                        yChannelSelector="${this.options.yChannel}"/>
                    <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green" />

                    <feDisplacementMap id="blueChannel-${this.uniqueId}" in="SourceGraphic" in2="map" result="dispBlue" 
                        scale="${this.options.distortionScale + this.options.blueOffset}" 
                        xChannelSelector="${this.options.xChannel}" 
                        yChannelSelector="${this.options.yChannel}"/>
                    <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />

                    <feBlend in="red" in2="green" mode="screen" result="rg" />
                    <feBlend in="rg" in2="blue" mode="screen" result="output" />
                    <feGaussianBlur id="gaussianBlur-${this.uniqueId}" in="output" stdDeviation="${this.options.displace}" />
                </filter>
            </defs>
        `;

        this.element.insertBefore(svg, this.element.firstChild);

        // Cache references
        this.feImage = svg.querySelector(`#feImage-${this.uniqueId}`);
    }

    generateDisplacementMap() {
        const rect = this.element.getBoundingClientRect();
        const actualWidth = rect.width || 400;
        const actualHeight = rect.height || 200;
        const edgeSize = Math.min(actualWidth, actualHeight) * (this.options.borderWidth * 0.5);

        const svgContent = `
            <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="${this.redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stop-color="#0000"/>
                        <stop offset="100%" stop-color="red"/>
                    </linearGradient>
                    <linearGradient id="${this.blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#0000"/>
                        <stop offset="100%" stop-color="blue"/>
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${this.options.borderRadius}" fill="url(#${this.redGradId})" />
                <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${this.options.borderRadius}" fill="url(#${this.blueGradId})" style="mix-blend-mode: ${this.options.mixBlendMode}" />
                <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${this.options.borderRadius}" fill="hsl(0 0% ${this.options.brightness}% / ${this.options.opacity})" style="filter:blur(${this.options.blur}px)" />
            </svg>
        `;

        return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
    }

    updateDisplacementMap() {
        if (this.feImage) {
            this.feImage.setAttribute('href', this.generateDisplacementMap());
        }
    }

    setupResizeObserver() {
        const resizeObserver = new ResizeObserver(() => {
            setTimeout(() => this.updateDisplacementMap(), 0);
        });
        resizeObserver.observe(this.element);
    }
}
