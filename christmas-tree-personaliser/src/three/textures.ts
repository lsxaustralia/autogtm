import * as THREE from 'three';

/** Small deterministic PRNG so the procedural textures look the same every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

/** Oiled oak planks: colour map plus a matching roughness map. */
export function createWoodTextures() {
  const W = 2048;
  const H = 1024;
  const rand = mulberry32(7);
  const [c, ctx] = canvas(W, H);
  const [rc, rctx] = canvas(W, H);

  const planks = 5;
  const ph = H / planks;
  const tones = ['#a8784a', '#b08152', '#9f6f43', '#ad7c4d', '#a57548'];

  for (let p = 0; p < planks; p++) {
    const y0 = p * ph;
    ctx.fillStyle = tones[p % tones.length];
    ctx.fillRect(0, y0, W, ph);
    rctx.fillStyle = '#8a8a8a';
    rctx.fillRect(0, y0, W, ph);

    // long flowing grain lines
    const lines = 70;
    const phase = rand() * 100;
    for (let i = 0; i < lines; i++) {
      const baseY = y0 + rand() * ph;
      const amp = 2 + rand() * 6;
      const freq = 0.002 + rand() * 0.004;
      const dark = rand() < 0.55;
      ctx.strokeStyle = dark
        ? `rgba(70,40,18,${0.08 + rand() * 0.16})`
        : `rgba(225,180,130,${0.05 + rand() * 0.1})`;
      ctx.lineWidth = 0.6 + rand() * 2.2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const y = baseY + Math.sin(x * freq + phase + i) * amp + Math.sin(x * freq * 3.7 + i * 2) * amp * 0.25;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      rctx.strokeStyle = dark ? 'rgba(200,200,200,0.25)' : 'rgba(90,90,90,0.2)';
      rctx.lineWidth = ctx.lineWidth;
      rctx.stroke();
    }

    // a couple of soft knots
    const knots = Math.floor(rand() * 2);
    for (let k = 0; k < knots; k++) {
      const kx = rand() * W;
      const ky = y0 + ph * (0.3 + rand() * 0.4);
      for (let r = 26; r > 2; r -= 3) {
        ctx.strokeStyle = `rgba(80,45,20,${0.06 + (26 - r) * 0.006})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 2.6, r * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // plank seam
    ctx.fillStyle = 'rgba(50,28,12,0.55)';
    ctx.fillRect(0, y0, W, 2);
    rctx.fillStyle = '#d0d0d0';
    rctx.fillRect(0, y0, W, 2);
  }

  // fine pores
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = new THREE.CanvasTexture(rc);
  for (const t of [map, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  return { map, roughnessMap };
}

/** Fine horizontal layer lines, used as a bump map for the 3D-printed parts. */
export function createLayerLineTexture() {
  const [c, ctx] = canvas(64, 256);
  const rand = mulberry32(3);
  for (let y = 0; y < 256; y++) {
    const v = y % 4 < 2 ? 150 : 110;
    const n = Math.round(v + (rand() - 0.5) * 16);
    ctx.fillStyle = `rgb(${n},${n},${n})`;
    ctx.fillRect(0, y, 64, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft studio sweep: warm centre falling off towards the edges. */
export function createBackdropTexture() {
  const [c, ctx] = canvas(32, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#d9d0c4');
  g.addColorStop(0.42, '#f1ebe2');
  g.addColorStop(0.5, '#f4eee6');
  g.addColorStop(0.62, '#e9e0d3');
  g.addColorStop(1, '#bcae9c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
