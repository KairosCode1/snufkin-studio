"""Genera el icono de SnufkinStudio — S split blanco/violeta sobre fondo dark navy
Diseño: S Georgia Bold Italic grande, mitad izquierda blanca, mitad derecha violeta,
sobre fondo #0e1020 con esquinas muy redondeadas estilo iOS/Win11.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
from pathlib import Path

OUT_DIR = Path(__file__).parent
PNG_OUT = OUT_DIR / "icon.png"
ICO_OUT = OUT_DIR / "icon.ico"

# ── Paleta ────────────────────────────────────────────────────────────────────
BG_TOP    = (13, 14, 28)      # #0D0E1C — fondo oscuro navy
BG_BOT    = ( 7,  8, 18)      # #070812 — más oscuro abajo
WHITE_S   = (237, 238, 248)   # #EDEEF8 — blanco cálido
VIOLET_S  = (110, 115, 210)   # #6E73D2 — violeta exacto del logo UI

SIZE = 1024

# ── Helpers ───────────────────────────────────────────────────────────────────

def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([(0,0),(size,size)], radius=radius, fill=255)
    return m

def gradient_bg(size, c1, c2):
    img = Image.new("RGB", (size, size))
    px  = img.load()
    for y in range(size):
        t = y / (size - 1)
        r = int(c1[0] + (c2[0]-c1[0])*t)
        g = int(c1[1] + (c2[1]-c1[1])*t)
        b = int(c1[2] + (c2[2]-c1[2])*t)
        for x in range(size):
            px[x, y] = (r, g, b)
    return img

def diagonal_mask(size, angle_deg=52):
    """Máscara diagonal: blanco arriba-izquierda, negro abajo-derecha."""
    import math
    m   = Image.new("L", (size, size), 0)
    rad = math.radians(angle_deg)
    nx  = math.cos(rad)   # normal del plano diagonal
    ny  = math.sin(rad)
    cx  = size * 0.50
    cy  = size * 0.50
    px  = m.load()
    for y in range(size):
        for x in range(size):
            dot = (x - cx) * nx + (y - cy) * ny
            px[x, y] = 255 if dot < 0 else 0
    return m

def make_icon():
    radius = int(SIZE * 0.28)   # ~28% — muy redondeado estilo macOS/iOS

    # 1. Fondo oscuro con degradado vertical y esquinas redondeadas
    bg     = gradient_bg(SIZE, BG_TOP, BG_BOT)
    mask   = rounded_mask(SIZE, radius)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    canvas.paste(bg, (0,0), mask)

    # 2. Highlight sutil en el borde superior (línea de luz)
    hl = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    ImageDraw.Draw(hl).rounded_rectangle(
        [(0,0),(SIZE-1,SIZE-1)], radius=radius,
        outline=(255,255,255,22), width=2)
    canvas.alpha_composite(hl)

    # 3. Cargar fuente Georgia Bold Italic
    font_path = "C:/Windows/Fonts/georgiaz.ttf"
    font_size = int(SIZE * 0.72)
    font      = ImageFont.truetype(font_path, font_size)

    # Medir la S para centrarla perfectamente
    bbox   = font.getbbox("S")
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x0     = (SIZE - tw) // 2 - bbox[0]
    y0     = (SIZE - th) // 2 - bbox[1] - int(SIZE * 0.03)  # ligeramente arriba

    # 4. Capa auxiliar de la S (para generar sombra/glow)
    s_full = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    ImageDraw.Draw(s_full).text((x0, y0), "S", font=font, fill=WHITE_S + (255,))

    # Sombra difusa oscura (profundidad)
    shadow = s_full.filter(ImageFilter.GaussianBlur(18))
    shadow_dark = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    r,g,b,a = shadow.split()
    a = a.point(lambda v: int(v * 0.55))
    shadow_dark = Image.merge("RGBA", (Image.new("L",shadow.size,0),
                                        Image.new("L",shadow.size,0),
                                        Image.new("L",shadow.size,0), a))
    # Desplazar la sombra ligeramente abajo-derecha
    shadow_shifted = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    shadow_shifted.paste(shadow_dark, (int(SIZE*0.02), int(SIZE*0.025)))
    canvas.alpha_composite(Image.composite(shadow_shifted,
                                           Image.new("RGBA",(SIZE,SIZE),(0,0,0,0)), mask))

    # 5. S en blanco (mitad izquierda)
    s_white  = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    ImageDraw.Draw(s_white).text((x0, y0), "S", font=font, fill=WHITE_S + (255,))

    # 6. S en violeta (mitad derecha)
    s_violet = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    ImageDraw.Draw(s_violet).text((x0, y0), "S", font=font, fill=VIOLET_S + (255,))

    # 7. Máscara diagonal para dividir las dos S
    #    La diagonal va desde arriba-izquierda a abajo-derecha, cortando la S por la mitad
    diag = diagonal_mask(SIZE, angle_deg=50)

    # S combinada: blanco donde diag=255, violeta donde diag=0
    s_combined = Image.composite(s_white, s_violet, diag)

    # 8. Glow violeta sutil detrás de la parte violeta
    glow_violet = s_violet.filter(ImageFilter.GaussianBlur(22))
    r,g,b,a = glow_violet.split()
    a = a.point(lambda v: int(v * 0.40))
    glow_violet = Image.merge("RGBA", (r,g,b,a))
    canvas.alpha_composite(Image.composite(glow_violet,
                                           Image.new("RGBA",(SIZE,SIZE),(0,0,0,0)), mask))

    # 9. Glow blanco sutil detrás de la parte blanca
    glow_white = s_white.filter(ImageFilter.GaussianBlur(28))
    r,g,b,a = glow_white.split()
    a = a.point(lambda v: int(v * 0.18))
    glow_white = Image.merge("RGBA", (r,g,b,a))
    canvas.alpha_composite(Image.composite(glow_white,
                                           Image.new("RGBA",(SIZE,SIZE),(0,0,0,0)), mask))

    # 10. Pegar S combinada (clipped al borde redondeado)
    canvas.alpha_composite(Image.composite(s_combined,
                                           Image.new("RGBA",(SIZE,SIZE),(0,0,0,0)), mask))

    # 11. Guardar PNG
    canvas.save(PNG_OUT, "PNG")
    print(f"PNG: {PNG_OUT}")

    # 12. ICO multi-resolución
    sizes = [16, 24, 32, 48, 64, 96, 128, 256]
    canvas.save(ICO_OUT, format="ICO", sizes=[(s,s) for s in sizes])
    print(f"ICO: {ICO_OUT}  ({sizes})")

if __name__ == "__main__":
    make_icon()
