'use strict';

/**
 * Draws the camera as a picture-in-picture bubble over the shared screen and sends the result as a
 * single video track, so the peer sees both without any extra track, renegotiation or signaling.
 */
class ScreenCameraComposer {
    static POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
    static MAX_WIDTH = 1920;
    static MAX_HEIGHT = 1080;
    static MAX_FPS = 30;

    static supported() {
        const canvas = document.createElement('canvas');
        return typeof canvas.captureStream === 'function' && !!canvas.getContext('2d');
    }

    static isPosition(value) {
        return ScreenCameraComposer.POSITIONS.includes(value);
    }

    /**
     * Where to draw the camera bubble inside a width x height frame
     * @returns {{x: number, y: number, width: number, height: number, radius: number}}
     */
    static getLayout(width, height, cameraWidth, cameraHeight, position) {
        const ratio = cameraWidth > 0 && cameraHeight > 0 ? cameraHeight / cameraWidth : 3 / 4;
        let bubbleWidth = Math.max(Math.min(160, width * 0.4), width * 0.2);
        let bubbleHeight = bubbleWidth * ratio;
        if (bubbleHeight > height * 0.4) {
            bubbleHeight = height * 0.4;
            bubbleWidth = bubbleHeight / ratio;
        }
        bubbleWidth = Math.round(bubbleWidth);
        bubbleHeight = Math.round(bubbleHeight);
        const margin = Math.round(Math.min(width, height) * 0.025);
        return {
            x: position.endsWith('left') ? margin : width - bubbleWidth - margin,
            y: position.startsWith('top') ? margin : height - bubbleHeight - margin,
            width: bubbleWidth,
            height: bubbleHeight,
            radius: Math.round(Math.min(bubbleWidth, bubbleHeight) * 0.08),
        };
    }

    constructor(position) {
        this.position = position;
        this.stopped = false;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
        this.screenVideo = this.createVideo();
        this.cameraVideo = this.createVideo();
    }

    createVideo() {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        // Kept in the DOM (but invisible) so browsers keep decoding frames
        video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
        video.setAttribute('aria-hidden', 'true');
        document.body.appendChild(video);
        return video;
    }

    async start(screenStream, cameraTrack) {
        this.screenTrack = screenStream.getVideoTracks()[0];
        if (!this.screenTrack) throw new Error('No screen video track');
        this.cameraTrack = cameraTrack;
        this.screenVideo.srcObject = new MediaStream([this.screenTrack]);
        this.cameraVideo.srcObject = new MediaStream([cameraTrack]);
        await Promise.all([this.screenVideo.play(), this.cameraVideo.play()]);
        if (this.stopped) throw new Error('Screen composition stopped');
        this.fps = Math.min(
            this.screenTrack.getSettings?.().frameRate || ScreenCameraComposer.MAX_FPS,
            ScreenCameraComposer.MAX_FPS
        );
        this.render();
        this.outputTrack = this.canvas.captureStream(this.fps).getVideoTracks()[0];
        if ('contentHint' in this.outputTrack) this.outputTrack.contentHint = this.screenTrack.contentHint || 'detail';
        this.stopTicker = this.startTicker(1000 / this.fps, () => this.render());
        return new MediaStream([this.outputTrack, ...screenStream.getAudioTracks()]);
    }

    /**
     * Timers of hidden tabs are heavily throttled, and the call tab is usually hidden while sharing
     * another window, so frames are paced from a worker when possible.
     */
    startTicker(interval, tick) {
        try {
            const source = 'let id;onmessage=(e)=>{clearInterval(id);id=setInterval(()=>postMessage(0),e.data);};';
            const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
            const worker = new Worker(url);
            worker.onmessage = tick;
            worker.postMessage(interval);
            return () => {
                worker.terminate();
                URL.revokeObjectURL(url);
            };
        } catch (error) {
            console.warn('Screen camera worker unavailable, using a regular timer', error);
            const id = setInterval(tick, interval);
            return () => clearInterval(id);
        }
    }

    setPosition(position) {
        this.position = position;
    }

    setCameraTrack(track) {
        this.cameraTrack = track;
        this.cameraVideo.srcObject = new MediaStream([track]);
        this.cameraVideo.play().catch(() => {});
    }

    resize() {
        const { videoWidth, videoHeight } = this.screenVideo;
        const scale = Math.min(
            1,
            ScreenCameraComposer.MAX_WIDTH / videoWidth,
            ScreenCameraComposer.MAX_HEIGHT / videoHeight
        );
        const width = Math.max(1, Math.round(videoWidth * scale));
        const height = Math.max(1, Math.round(videoHeight * scale));
        if (this.canvas.width === width && this.canvas.height === height) return;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    render() {
        if (this.stopped || this.screenVideo.readyState < 2 || !this.screenVideo.videoWidth) return;
        this.resize();
        const { width, height } = this.canvas;
        this.context.drawImage(this.screenVideo, 0, 0, width, height);
        if (this.isCameraVisible()) this.drawCamera(width, height);
        this.outputTrack?.requestFrame?.();
    }

    isCameraVisible() {
        return (
            ScreenCameraComposer.isPosition(this.position) &&
            this.cameraTrack?.readyState === 'live' &&
            this.cameraTrack.enabled &&
            this.cameraVideo.readyState >= 2
        );
    }

    drawCamera(width, height) {
        const ctx = this.context;
        const box = ScreenCameraComposer.getLayout(
            width,
            height,
            this.cameraVideo.videoWidth,
            this.cameraVideo.videoHeight,
            this.position
        );
        ctx.save();
        this.roundedRect(box);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = Math.max(4, box.radius);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.clip();
        ctx.drawImage(this.cameraVideo, box.x, box.y, box.width, box.height);
        ctx.restore();
        ctx.save();
        this.roundedRect(box);
        ctx.lineWidth = Math.max(2, Math.round(box.width * 0.01));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.stroke();
        ctx.restore();
    }

    roundedRect({ x, y, width, height, radius }) {
        const ctx = this.context;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    /**
     * @param {boolean} stopSources also stop the screen and camera tracks (false when falling back to the plain screen)
     */
    stop(stopSources = true) {
        if (this.stopped) return;
        this.stopped = true;
        this.stopTicker?.();
        this.outputTrack?.stop();
        if (stopSources) {
            this.screenTrack?.stop();
            this.cameraTrack?.stop();
        }
        for (const video of [this.screenVideo, this.cameraVideo]) {
            video.pause();
            video.srcObject = null;
            video.remove();
        }
    }
}
