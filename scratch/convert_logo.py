import os
from PIL import Image

def convert_logo():
    src_path = r"d:\kiko\website\frontend\public\logo.jpg"
    assets_dir = r"d:\kiko\desktop\assets"
    
    if not os.path.exists(src_path):
        print(f"Error: Source image not found at {src_path}")
        return
        
    os.makedirs(assets_dir, exist_ok=True)
    
    img = Image.open(src_path)
    print(f"Opened source image: {src_path} (size: {img.size}, format: {img.format})")
    
    # 1. Save as PNG (512x512 or original size resized to square)
    # Ensure it's a square image
    size = max(img.size)
    square_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    # Paste image in the center
    square_img.paste(img, ((size - img.size[0]) // 2, (size - img.size[1]) // 2))
    
    png_img = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    png_path = os.path.join(assets_dir, "icon.png")
    png_img.save(png_path, "PNG")
    print(f"Saved PNG to {png_path}")
    
    # 2. Save as ICO (multi-resolution)
    ico_path = os.path.join(assets_dir, "icon.ico")
    # For ICO, we need standard sizes
    ico_img = square_img.resize((256, 256), Image.Resampling.LANCZOS)
    ico_img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Saved ICO to {ico_path}")
    
    # 3. Save as ICNS (macOS)
    icns_path = os.path.join(assets_dir, "icon.icns")
    try:
        icns_img = square_img.resize((512, 512), Image.Resampling.LANCZOS)
        icns_img.save(icns_path, format="ICNS")
        print(f"Saved ICNS to {icns_path}")
    except Exception as e:
        print(f"Could not save ICNS (Pillow may need extra config/sizes): {e}")
        # Let's try specifying standard sizes for ICNS
        try:
            # Pillow's ICNS support can automatically scale or might need specific formats
            # Let's try standard way
            icns_img.save(icns_path, format="ICNS")
        except Exception as e2:
            print(f"Fallback ICNS save failed: {e2}")

if __name__ == "__main__":
    convert_logo()
