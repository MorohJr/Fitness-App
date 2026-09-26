# יוצר את אייקוני האפליקציה (PNG) ב-public/. מריצים: npm run icons
from PIL import Image, ImageDraw

BG = (10, 10, 10)
FG = (215, 255, 58)

def draw(size, pad_ratio):
    s = 4 * size  # ציור בגודל כפול ארבע והקטנה, לקצוות חלקים
    img = Image.new('RGB', (s, s), BG)
    d = ImageDraw.Draw(img)
    pad = s * pad_ratio
    w = s - 2 * pad
    cy = s / 2
    bar_h = w * 0.09
    d.rounded_rectangle([pad + w * 0.18, cy - bar_h / 2, pad + w * 0.82, cy + bar_h / 2], radius=bar_h / 2, fill=FG)
    for side in (0, 1):
        # צלחות: גדולה וקטנה בכל צד
        for (x0, x1, h) in ((0.10, 0.22, 0.56), (0.0, 0.08, 0.36)):
            if side == 0:
                a, b = pad + w * x0, pad + w * x1
            else:
                a, b = pad + w * (1 - x1), pad + w * (1 - x0)
            d.rounded_rectangle([a, cy - w * h / 2, b, cy + w * h / 2], radius=w * 0.03, fill=FG)
    return img.resize((size, size), Image.LANCZOS)

draw(192, 0.14).save('public/icon-192.png')
draw(512, 0.14).save('public/icon-512.png')
draw(512, 0.24).save('public/icon-512-maskable.png')  # שטח בטוח לאייקון מעוגל
draw(180, 0.14).save('public/apple-touch-icon.png')
print('icons ok')
