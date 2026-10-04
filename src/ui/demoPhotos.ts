// תמונות ההדגמה (R-DEMO-2): איור של הדמות במקום צילום, כ-JPEG כמו תמונה אמיתית (R-PHOTO-1)
import { h, render } from 'preact';
import { Avatar } from './components/Avatar';
import type { DemoPhotoSpec } from '../data/demo/generate';

const VIEW_LABEL = { front: 'חזית', side: 'צד', back: 'גב' } as const;

export async function renderDemoPhoto(spec: DemoPhotoSpec): Promise<Blob | null> {
  try {
    const div = document.createElement('div');
    render(h(Avatar, { body: spec.body, strength: spec.strength, size: 300 }), div);
    // בתמונה אין משתני CSS: צבע ההדגשה וצבע הצל ישירות
    const svg = div.innerHTML.replaceAll('var(--accent)', '#ff6a1a').replaceAll('currentColor', '#000').replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const W = 720;
    const H = 960;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // קיר ורצפה, אותו מקום בכל התמונות (נספח ד')
    ctx.fillStyle = '#ebe7df';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d9d2c5';
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    const ih = H * 0.78;
    const iw = ih * (120 / 160);
    ctx.save();
    ctx.translate(W / 2, 0);
    if (spec.view === 'side') ctx.scale(0.72, 1);
    ctx.drawImage(img, -iw / 2, H * 0.08, iw, ih);
    ctx.restore();
    ctx.fillStyle = '#3a3a3a';
    ctx.font = '600 34px Rubik, sans-serif';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(`${VIEW_LABEL[spec.view]} · ${spec.date.split('-').reverse().join('.')}`, W - 30, 56);
    return await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.8));
  } catch {
    return null;
  }
}
