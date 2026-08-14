import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

/**
 * Small "Scan" button that opens the device camera in a modal, decodes any QR
 * code it sees using jsQR, and calls onScan(text) with the decoded value.
 *
 * Requires a secure context: works on https:// origins and on http://localhost
 * during development, but browsers block camera access on plain http:// over
 * a LAN IP (e.g. http://192.168.x.x:5173) — see the note surfaced in the UI.
 */
function friendlyCameraError(err) {
  const name = err?.name || '';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return "No camera was found on this device. If you're testing on a desktop/laptop without a webcam, open this page on a phone instead — that's what this scanner is built for.";
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Camera access was blocked. Allow camera permissions for this site in your browser settings (and check OS-level camera privacy settings), then try again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is already in use by another app or browser tab. Close whatever else is using it and try again.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'No camera on this device matches what was requested. Type the code in manually instead.';
  }
  return err?.message || 'Could not access the camera. Check permissions and try again.';
}

export default function QRScannerButton({ onScan, label = 'Scan' }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const closeScanner = () => {
    stopCamera();
    setOpen(false);
    setError('');
  };

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is not available in this browser.');
        return;
      }
      if (!window.isSecureContext) {
        setError('Camera scanning needs HTTPS (or localhost). Type the code in manually instead, or serve the app over HTTPS.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err) {
        setError(friendlyCameraError(err));
      }
    };

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          onScan(code.data);
          closeScanner();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen(true)}
        title="Scan QR code with camera"
        style={{ whiteSpace: 'nowrap' }}
      >
        📷 {label}
      </button>

      {open && (
        <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && closeScanner()}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>Scan QR Code</h3>
              <button type="button" className="btn btn-outline btn-sm" onClick={closeScanner}>Close</button>
            </div>
            <div className="modal-body">
              {error ? (
                <div className="error-banner">{error}</div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ width: '100%', borderRadius: 6, background: '#000' }}
                  />
                  <p style={{ fontSize: '12.5px', color: 'var(--ink-500)', marginTop: 8 }}>
                    Point the camera at the QR code. It fills in automatically as soon as it's recognized.
                  </p>
                </>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
