// Dot Grid Implementation (Vanilla JS)

const DotGrid = (() => {
    const config = {
        dotSize: 4,
        gap: 24,
        baseColor: '#B39DDB', // Pastel Purple
        activeColor: '#80CBC4', // Pastel Teal
        repulsionRadius: 80, // Decreased radius as requested
        repulsionStrength: 20, // Max pixels to push away
        lerpFactor: 0.1 // Smoothness of movement (0.1 = smooth, 1.0 = instant)
    };

    let canvas, ctx, wrapper;
    let dots = [];
    let width, height;
    let animationFrameId;
    let resizeObserver;

    const pointer = {
        x: -1000,
        y: -1000
    };

    function hexToRgb(hex) {
        const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (!m) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(m[1], 16),
            g: parseInt(m[2], 16),
            b: parseInt(m[3], 16)
        };
    }

    const baseRgb = hexToRgb(config.baseColor);
    const activeRgb = hexToRgb(config.activeColor);

    function init() {
        wrapper = document.querySelector('.dot-grid__wrap');
        canvas = document.querySelector('.dot-grid__canvas');

        if (!wrapper || !canvas) return;

        ctx = canvas.getContext('2d');

        buildGrid();

        // Event Listeners
        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('mouseleave', onLeave);

        // Resize Observer
        if ('ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(buildGrid);
            resizeObserver.observe(wrapper);
        } else {
            window.addEventListener('resize', buildGrid);
        }

        // Start Loop
        draw();
    }

    function buildGrid() {
        if (!wrapper || !canvas) return;

        const rect = wrapper.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.scale(dpr, dpr);

        const cols = Math.floor((width + config.gap) / (config.dotSize + config.gap));
        const rows = Math.floor((height + config.gap) / (config.dotSize + config.gap));
        const cell = config.dotSize + config.gap;

        const gridW = cell * cols - config.gap;
        const gridH = cell * rows - config.gap;

        const extraX = width - gridW;
        const extraY = height - gridH;

        const startX = extraX / 2 + config.dotSize / 2;
        const startY = extraY / 2 + config.dotSize / 2;

        dots = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cx = startX + x * cell;
                const cy = startY + y * cell;
                dots.push({
                    cx,
                    cy,
                    xOffset: 0,
                    yOffset: 0,
                    targetX: 0,
                    targetY: 0
                });
            }
        }
    }

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        const { x: px, y: py } = pointer;
        const radiusSq = config.repulsionRadius * config.repulsionRadius;

        // Pre-calculate circle path
        const circlePath = new Path2D();
        circlePath.arc(0, 0, config.dotSize / 2, 0, Math.PI * 2);

        for (const dot of dots) {
            // 1. Calculate Target Positions based on Repulsion
            const dx = dot.cx - px;
            const dy = dot.cy - py;
            const distSq = dx * dx + dy * dy;

            if (distSq < radiusSq) {
                const dist = Math.sqrt(distSq);
                const force = (config.repulsionRadius - dist) / config.repulsionRadius;
                const angle = Math.atan2(dy, dx);

                const moveDist = force * config.repulsionStrength;

                dot.targetX = Math.cos(angle) * moveDist;
                dot.targetY = Math.sin(angle) * moveDist;

                // Color blending
                const t = force; // 0 to 1
                dot.r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
                dot.g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
                dot.b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
                dot.a = 0.3 + (0.5 * t);
            } else {
                dot.targetX = 0;
                dot.targetY = 0;

                dot.r = baseRgb.r;
                dot.g = baseRgb.g;
                dot.b = baseRgb.b;
                dot.a = 0.3;
            }

            // 2. Physics Update (Lerp)
            dot.xOffset = lerp(dot.xOffset, dot.targetX, config.lerpFactor);
            dot.yOffset = lerp(dot.yOffset, dot.targetY, config.lerpFactor);

            // 3. Draw
            const ox = dot.cx + dot.xOffset;
            const oy = dot.cy + dot.yOffset;

            const style = `rgba(${dot.r},${dot.g},${dot.b},${dot.a})`;

            ctx.save();
            ctx.translate(ox, oy);
            ctx.fillStyle = style;
            ctx.fill(circlePath);
            ctx.restore();
        }

        animationFrameId = requestAnimationFrame(draw);
    }

    function onMove(e) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        pointer.x = e.clientX - rect.left;
        pointer.y = e.clientY - rect.top;
    }

    function onLeave() {
        pointer.x = -1000;
        pointer.y = -1000;
    }

    return { init };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(DotGrid.init, 100);
});
