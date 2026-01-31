import os
import time
from celery_app import celery_app
from config import settings
from processor import process_product_image
from database import SessionLocal
from models import Product


@celery_app.task(name="tasks.merge_and_process")
def merge_and_process(file_uuid, file_name, total_chunks, product_id, sync_by):
    """
    Background task to merge chunks and then run processing.
    """
    print(f"Background: Starting merge for {file_uuid} ({total_chunks} chunks)")
    
    final_path = f"storage/uploads/{file_uuid}_{file_name}"
    
    # 1. Merge Chunks
    try:
        with open(final_path, "wb") as final_file:
            for i in range(total_chunks):
                chunk_file = f"storage/chunks/{file_uuid}_{i}"
                if os.path.exists(chunk_file):
                    with open(chunk_file, "rb") as cf:
                        final_file.write(cf.read())
                else:
                    print(f"Error: Chunk {chunk_file} missing during merge.")
                    return {"success": False, "error": f"Chunk {i} missing"}
    except Exception as e:
        print(f"Merge error: {e}")
        return {"success": False, "error": str(e)}

    # 2. Cleanup chunks
    for i in range(total_chunks):
        chunk_file = f"storage/chunks/{file_uuid}_{i}"
        try:
            if os.path.exists(chunk_file):
                os.remove(chunk_file)
        except Exception:
            pass

    # 3. Update DB and Trigger Processing
    db = SessionLocal()
    try:
        # We need to import Product inside here if we can't import at top level, 
        # OR better: Refactor Models to a separate file. 
        # Let's try to import Product from main. If main has side effects, we might need to fix main.
        # Given 'main.py' has 'seed_admin()' call at the bottom, importing it will run that.
        # It's better to duplicate the Product update logic lightly or accept the side effect.
        # Actually, let's move Models to database.py to do this properly? 
        # User asked for 'fix', let's stick to the plan: create tasks.py. 
        # I will import Product from main, assuming the side effects (seed_admin) are harmless on worker start.
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            print(f"Product {product_id} not found.")
            return

            
        sync_value = getattr(product, sync_by, None)
        ids_to_process = []
        
        if sync_value and sync_by in ["nomor_id", "sku_platform"]:
            affected_products = db.query(Product).filter(getattr(Product, sync_by) == sync_value).all()
            for p in affected_products:
                p.image_upload = final_path
                p.final_image = None
                p.preview_image = None
                ids_to_process.append(p.id)
        else:
            product.image_upload = final_path
            product.final_image = None
            product.preview_image = None
            ids_to_process.append(product.id)
            
        db.commit()
        
        # 4. Trigger Image Processing (In-process or sub-task? Processing is heavy.)
        # Since we are already in a Celery worker, we can run the processing function directly.
        # No need to spawn another task unless we want parallelism per image.
        # However, if we have 100 synchronized products, processing them sequentially in one task might block the worker too long (stacking tasks).
        # Better: Spawn individual process tasks for each product.
        
        print(f"Merge complete. Spawning {len(ids_to_process)} processing tasks.")
        
        for pid in ids_to_process:
            run_processing_task.delay(pid, final_path)
            
    except Exception as e:
        print(f"Db update error: {e}")
    finally:
        db.close()

@celery_app.task(name="tasks.run_processing_task")
def run_processing_task(product_id: int, upload_path: str):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return

            
        font_path = settings.FONT_PATH
        print(f"Worker processing product {product_id}")
        
        result = process_product_image({
            "id": product.id,
            "no_pesanan": product.no_pesanan,
            "spesifikasi_produk": product.spesifikasi_produk,
            "sku_platform": product.sku_platform,
            "id_produk": product.id_produk,
            "nomor_id": product.nomor_id,
            "jumlah_barang": product.jumlah_barang
        }, upload_path, font_path, sku_img_path=product.sku_gambar)
        
        if result.get("success"):
            product.final_image = result["final"]
            product.preview_image = result["preview"]
            db.commit()
            print(f"Worker finished product {product_id}")
            
    except Exception as e:
        print(f"Processing task error: {e}")
    finally:
        db.close()
