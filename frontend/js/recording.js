'use strict';

class Recording {
    constructor(stream, recordingLabel, recordingTime, recordingBtn, videoSelect = null, audioSelect = null) {
        this._stream = stream;
        this._recordingLabel = recordingLabel;
        this._recordingBtn = recordingBtn;
        this._videoSelect = videoSelect;
        this._audioSelect = audioSelect;
        this._recordingTime = recordingTime;
        this._mediaRecorder = null;
        this._recordedBlobs = [];
        this._recordingStream = false;
    }

    start() {
        let options = this.getSupportedMimeTypes();
        console.log('MediaRecorder options supported', options);
        options = { mimeType: options[0] };
        try {
            this._mediaRecorder = new MediaRecorder(this._stream, options);
            this._mediaRecorder.start();
            this._mediaRecorder.addEventListener('start', (e) => {
                playSound('recStart');
                console.log('MediaRecorder started', e);
                this._recordingStream = true;
                this.handleElements();
                startRecordingTimer();
            });
            this._mediaRecorder.addEventListener('dataavailable', (e) => {
                console.log('MediaRecorder data', e);
                if (e.data && e.data.size > 0) this._recordedBlobs.push(e.data);
            });
            this._mediaRecorder.addEventListener('stop', (e) => {
                this._recordingStream = false;
                console.log('MediaRecorder stopped', e);
                this.handleElements();
                stopRecordingTimer();
                this.downloadRecordedStream();
            });
        } catch (err) {
            this._recordingStream = false;
            console.error('MediaRecorder error', err);
            return popupMessage('error', 'MediaRecorder', "Can't start stream recording" + err);
        }
    }

    handleElements() {
        if (this._audioSelect) elemDisable(this._audioSelect, this._recordingStream);
        if (this._videoSelect) elemDisable(this._videoSelect, this._recordingStream);
        this._recordingBtn.classList.toggle('red');
    }

    isStreamRecording() {
        return this._recordingStream;
    }

    getSupportedMimeTypes() {
        const possibleTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=h264,opus',
            'video/mp4;codecs=h264,aac',
            'video/mp4',
        ];
        return possibleTypes.filter((mimeType) => {
            return MediaRecorder.isTypeSupported(mimeType);
        });
    }

    downloadRecordedStream() {
        try {
            const type = this._recordedBlobs[0].type.includes('mp4') ? 'mp4' : 'webm';
            const blob = new Blob(this._recordedBlobs, { type: 'video/' + type });
            const recFileName = getDataTimeString() + '-recording.' + type;
            const currentDevice = isMobileDevice ? 'MOBILE' : 'PC';
            const blobFileSize = this.bytesToSize(blob.size);
            popupMessage(
                'clean',
                'Recording',
                `<div style="text-align: left;">
					🔴 &nbsp; Recording Info:
					<ul>
                        <li>Time: ${this._recordingTime.innerText}</li>
						<li>File: ${recFileName}</li>
						<li>Size: ${blobFileSize}</li>
					</ul>
					Please wait to be processed, then will be downloaded to your ${currentDevice} device.
				</div>`,
                'top',
            );
            this._recordingTime.innerText = '0s';
            this.saveBlobToFile(blob, recFileName);
        } catch (err) {
            popupMessage('error', 'Recording', 'Recording save failed: ' + err);
        }
    }

    bytesToSize(bytes) {
        if (bytes == 0) return '0 Byte';
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    saveBlobToFile(blob, fileName) {
        playSound('recStop');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }

    stop() {
        this._mediaRecorder.stop();
    }
}
