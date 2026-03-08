from PIL import Image, ImageDraw, ImageFont
import qrcode
import os
import time
import requests
from io import BytesIO

# Caching for performance
_font_cache = {}
_sku_cache = {}

# Disable PIL limit for large images
Image.MAX_IMAGE_PIXELS = None

def process_product_image(product, upload_path, font_path, sku_img_path=None):
    """
    Complete image composition mimicking the Laravel implementation.
    Optimized for memory handling of large files.
    """
    try:
        start_time = time.time()
        print(f"Processing image: {upload_path}, font: {font_path}")
        
        # Helper to load font with caching
        def load_font(fpath, size):
            cache_key = (fpath, size)
            if cache_key in _font_cache:
                return _font_cache[cache_key]
            
            try:
                if fpath and os.path.exists(fpath):
                    font = ImageFont.truetype(fpath, size)
                    _font_cache[cache_key] = font
                    return font
                else:
                    print(f"CRITICAL: Font file not found at {fpath}, using default.")
            except Exception as fe:
                print(f"Font load error: {fe}, using default.")
            return ImageFont.load_default()

        # 1. Load original image
        img = Image.open(upload_path)
        
        # Decide format: Use RGBA only if necessary or if you want consistent transparent header.
        # However, for memory efficiency on huge files, RGB is much better.
        # We will check if source has alpha.
        has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
        
        # For huge images, we SHOULD avoid convert if possible, but we need to paste the header.
        # Let's use RGB for memory saving if no alpha is needed.
        target_mode = 'RGBA' if has_alpha else 'RGB'
        img = img.convert(target_mode)
        
        orig_w, orig_h = img.size
        print(f"Image Resolution: {orig_w}x{orig_h}, Mode: {img.mode}")
        
        # Determine DPI (fallback to 300)
        orig_dpi = img.info.get('dpi', (300, 300))
        if not isinstance(orig_dpi, tuple):
            orig_dpi = (300, 300)
        dpi = orig_dpi[0]
        
        # 2. Layout Dimensions (Same as Laravel)
        header_width_cm = 9.0
        header_height_cm = 2.5
        gap_cm = 1.0
        
        header_w_px = min(int(header_width_cm * dpi / 2.54), orig_w)
        header_h_px = int(header_height_cm * dpi / 2.54)
        gap_px = int(gap_cm * dpi / 2.54)
        
        new_height = orig_h + header_h_px + gap_px
        
        # Create canvas
        # IMPORTANT: Use white (255, 255, 255) as base instead of transparent if the target is RGB
        bg_color = (255, 255, 255, 255) if target_mode == 'RGBA' else (255, 255, 255)
        canvas = Image.new(target_mode, (orig_w, new_height), bg_color)
        
        # 3. Draw Info Box
        draw = ImageDraw.Draw(canvas)
        box_x = orig_w - header_w_px
        # White background for the header box (already handled by canvas bg, but let's be explicit)
        draw.rectangle([box_x, 0, orig_w, header_h_px], fill=(255, 255, 255))
        
        padding = max(5, int(header_h_px / 20))
        square_size = int(header_h_px * 0.7)
        square_y = int((header_h_px - square_size) / 2)
        
        # 4. QR Code
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=1)
        qr.add_data(product.get('no_pesanan', 'NO_ORDER'))
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGBA')
        qr_img = qr_img.resize((square_size, square_size), Image.Resampling.LANCZOS)
        
        qr_x = box_x + header_w_px - square_size - padding
        canvas.paste(qr_img, (qr_x, square_y), qr_img)
        
        # ... (Label text logic remains same)
        try:
            base_font_size = max(10, int(header_h_px / 12))
            font_small = load_font(font_path, int(base_font_size * 0.8))
            label_text = str(product.get('no_pesanan', '-'))
            text_bbox = font_small.getbbox(label_text)
            text_w = text_bbox[2] - text_bbox[0]
            label_x = qr_x + (square_size - text_w) / 2
            label_y = square_y + square_size + 2
            draw.text((label_x, label_y), label_text, font=font_small, fill=(0, 0, 0))
        except Exception as e:
            print(f"QR Label error: {e}")
        
        # 5. SKU Image
        image_gap = padding * 2
        sku_x = qr_x - square_size - image_gap
        if sku_img_path:
            try:
                sku_img = None
                if sku_img_path in _sku_cache:
                    sku_img = _sku_cache[sku_img_path].copy()
                else:
                    if sku_img_path.startswith('http'):
                        resp = requests.get(sku_img_path, timeout=5)
                        sku_img = Image.open(BytesIO(resp.content))
                    else:
                        sku_img = Image.open(sku_img_path)
                    
                    if sku_img:
                        sku_img = sku_img.convert('RGBA')
                        _sku_cache[sku_img_path] = sku_img.copy()
                
                if sku_img:
                    w, h = sku_img.size
                    ratio = max(square_size / w, square_size / h)
                    sku_img = sku_img.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)
                    left = (sku_img.width - square_size) / 2
                    top = (sku_img.height - square_size) / 2
                    sku_img = sku_img.crop((left, top, left + square_size, top + square_size))
                    canvas.paste(sku_img, (sku_x, square_y), sku_img)
            except Exception as e:
                print(f"SKU Image error: {e}")
        else:
            draw.rectangle([sku_x, square_y, sku_x + square_size, square_y + square_size], outline=(204, 204, 204), width=2, fill=(238, 238, 238))

        # 6. Text Drawing
        try:
            base_font_size = max(10, int(header_h_px / 12))
            font = load_font(font_path, base_font_size)
            text_x = box_x + (padding * 2)
            line_h = int(base_font_size * 1.3)
            lines = [
                f"NO.PESANAN: {product.get('no_pesanan', '-')}",
                f"SPESIFIKASI: {str(product.get('spesifikasi_produk', '-'))[:30]}",
                f"SKU PLATFORM: {product.get('sku_platform', '-')}",
                f"ID PRODUK: {product.get('id_produk', '-')}",
                f"ID SKU: {product.get('nomor_id', '-')}",
            ]
            for i, line in enumerate(lines):
                draw.text((text_x, padding + (i * line_h)), line, font=font, fill=(0, 0, 0))
            qty_y = padding + (len(lines) * line_h) + padding
            draw.text((text_x, qty_y), "Qty:", font=font, fill=(0, 0, 0))
            qty_val_size = int(base_font_size * 3.5)
            qty_val_font = load_font(font_path, qty_val_size)
            qty_val_x = text_x + (base_font_size * 3)
            qty_val_y = qty_y - int(qty_val_size * 0.15)
            draw.text((qty_val_x, qty_val_y), str(product.get('jumlah_barang', 1)), font=qty_val_font, fill=(0, 0, 0))
        except Exception as e:
            print(f"Font/Text error: {e}")

        # 7. Paste Main Image BELOW the Header
        # Memory optimization: if target_mode is RGB, we don't need mask unless source has alpha
        mask = img if has_alpha else None
        canvas.paste(img, (0, header_h_px + gap_px), mask)
        
        # 8. Save Final & Preview
        final_id = f"{product.get('id', 'new')}_{int(time.time())}"
        final_filename = f"final_{final_id}.png"
        final_path = os.path.join("storage/final", final_filename)
        
        # Save as PNG (lossless) - Preserve original DPI
        print(f"Saving final result: {final_path}")
        canvas.save(final_path, "PNG", dpi=orig_dpi)
        
        # PREVIEW OPTIMIZATION: Instead of canvas.copy(), we scale down directly
        # and then save. Since we need the original canvas state for the return value?
        # Actually, the task is finished after this. So we can just mutate canvas.
        preview_filename = f"preview_{final_id}.png"
        preview_path = os.path.join("storage/preview", preview_filename)
        
        # Mutate canvas for thumbnail to save memory
        canvas.thumbnail((800, 800))
        canvas.save(preview_path, "PNG")
        
        duration = time.time() - start_time
        print(f"Finished processing in {duration:.2f}s")

        return {
            "success": True,
            "final": final_path.replace("\\", "/"),
            "preview": preview_path.replace("\\", "/"),
            "duration": duration
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"General processing error: {e}")
        return {"success": False, "error": str(e)}
