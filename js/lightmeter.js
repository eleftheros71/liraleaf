// Light meter: uses the Ambient Light Sensor API when present (gives lux),
// otherwise estimates relative brightness from the camera image.
// Camera estimates are relative, not calibrated lux.

export function classifyLux(lux) {
  if (lux < 500) return 'low';
  if (lux < 2500) return 'medium';
  if (lux < 10000) return 'bright';
  return 'direct';
}

export async function startLightMeter(video, onReading) {
  if ('AmbientLightSensor' in window) {
    try {
      const s = new window.AmbientLightSensor({ frequency: 2 });
      s.addEventListener('reading', () => onReading({ lux: Math.round(s.illuminance), level: classifyLux(s.illuminance), source: 'sensor' }));
      s.start();
      return () => s.stop();
    } catch { /* fall through to camera */ }
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.srcObject = stream;
  await video.play();
  const track = stream.getVideoTracks()[0];
  // Try to stop auto-exposure from hiding differences.
  try { await track.applyConstraints({ advanced: [{ exposureMode: 'manual' }] }); } catch { /* unsupported */ }
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 48;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const timer = setInterval(() => {
    ctx.drawImage(video, 0, 0, 64, 48);
    const d = ctx.getImageData(0, 0, 64, 48).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const luma = sum / (d.length / 4); // 0..255
    // Rough mapping, exponential because camera response is compressed.
    const lux = Math.round(10 * Math.pow(10, (luma / 255) * 4));
    onReading({ lux, level: classifyLux(lux), source: 'camera', luma: Math.round(luma) });
  }, 500);
  return () => { clearInterval(timer); stream.getTracks().forEach((t) => t.stop()); video.srcObject = null; };
}
