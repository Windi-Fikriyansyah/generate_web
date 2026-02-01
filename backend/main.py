import os
import json
import uuid
import time
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, BigInteger, func
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import redis
from config import settings

# Removing celery_app import from here if not used directly, 
# but run_processing_task might be used in other endpoints.


from database import engine, SessionLocal, get_db, Base
from models import Product, User


# Auth Configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    pwd_bytes = password.encode('utf-8')
    # Use explicit rounds for salt generation for better compatibility
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


# Initialize DB tables
Base.metadata.create_all(bind=engine)


# Seed Admin User
def seed_admin():
    try:
        db = SessionLocal()
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=get_password_hash("admin123")
            )
            db.add(admin)
            db.commit()
            print("Admin user seeded successfully.")
        db.close()
    except Exception as e:
        print(f"Error seeding admin: {e}")

seed_admin()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Redis
r = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

# Static storage
os.makedirs("storage/uploads", exist_ok=True)
os.makedirs("storage/final", exist_ok=True)
os.makedirs("storage/preview", exist_ok=True)
os.makedirs("storage/chunks", exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# dependency get_db imported from database module


# Processing logic moved to tasks.py
from tasks import merge_and_process, run_processing_task


@app.get("/products")
async def get_products(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc"
):
    query = db.query(Product)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Product.no_pesanan.ilike(search_filter)) |
            (Product.sku_platform.ilike(search_filter)) |
            (Product.nomor_id.ilike(search_filter))
        )
    
    total = query.count()
    
    # Dynamic Sorting
    if sort_by and hasattr(Product, sort_by):
        column = getattr(Product, sort_by)
        if sort_order == "asc":
            query = query.order_by(column.asc(), Product.id.desc())
        else:
            query = query.order_by(column.desc(), Product.id.desc())
    else:
        query = query.order_by(Product.created_at.desc(), Product.id.desc())

    products = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": products
    }

@app.post("/upload-chunk")
async def upload_chunk(
    file: UploadFile = File(...),
    chunkIndex: int = Form(...),
    totalChunks: int = Form(...),
    fileName: str = Form(...),
    fileUuid: str = Form(...),
    product_id: int = Form(...),
    sync_by: str = Form("nomor_id") # Default to nomor_id as in Laravel
):
    chunk_path = f"storage/chunks/{fileUuid}_{chunkIndex}"
    with open(chunk_path, "wb") as buffer:
        buffer.write(await file.read())
        
    if chunkIndex == totalChunks - 1:
        # Offload 'Assemble & Process' to Background Task
        # We return success immediately so the UI doesn't freeze.
        
        final_path = f"storage/uploads/{fileUuid}_{fileName}"
        
        merge_and_process.delay(
            fileUuid,
            fileName,
            totalChunks,
            product_id,
            sync_by
        )
        
        return {"message": "Upload assembled, processing in background.", "path": final_path, "ids": [product_id]}


    
    return {"message": f"Chunk {chunkIndex} received"}

# Auth Endpoints
@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

import shutil
import glob

def cleanup_file_logic(product_ids, db: Session):
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    for product in products:
        # Delete individual files linked to the product
        for attr in ["image_upload", "preview_image", "final_image"]:
            path = getattr(product, attr)
            if path and os.path.exists(path):
                try: os.remove(path)
                except: pass
        db.delete(product)

@app.post("/products/bulk-delete")
async def bulk_delete(ids: list[int], db: Session = Depends(get_db)):
    cleanup_file_logic(ids, db)
    db.commit()
    return {"message": f"{len(ids)} products deleted"}

@app.post("/products/delete-all")
async def delete_all_products(db: Session = Depends(get_db)):
    # 1. Get all product IDs
    all_ids = [p.id for p in db.query(Product.id).all()]
    
    # 2. Cleanup product files and database entries
    cleanup_file_logic(all_ids, db)
    
    # 3. Aggressive storage cleanup for anything leftover or dangling
    # This ensures uploads, chunks, final, previews are wiped even if not linked in DB
    folders_to_clear = ["storage/uploads", "storage/final", "storage/preview", "storage/chunks"]
    for folder in folders_to_clear:
        if os.path.exists(folder):
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f'Failed to delete {file_path}. Reason: {e}')
    
    # 4. Remove all exported ZIP files
    zip_files = glob.glob("storage/*.zip")
    for zip_file in zip_files:
        try: os.remove(zip_file)
        except: pass

    db.commit()
    return {"message": "All products and associated files deleted successfully"}

@app.get("/products/check-progress")
async def check_progress(ids: Optional[str] = None, batch_id: Optional[str] = None, db: Session = Depends(get_db)):
    if batch_id:
        # Check progress via Redis batch counter
        done = int(r.get(f"progress:{batch_id}") or 0)
        total = int(r.get(f"total:{batch_id}") or 0)
        return {
            "total": total,
            "done": done,
            "is_finished": total > 0 and done >= total,
            "batch_id": batch_id
        }
    
    if not ids:
        return {"total": 0, "done": 0, "is_finished": True}

    # fallback to original logic for backward compatibility
    id_list = [int(i) for i in ids.split(",")]
    total = len(id_list)
    done = db.query(Product).filter(Product.id.in_(id_list), Product.final_image.isnot(None)).count()
    return {
        "total": total,
        "done": done,
        "is_finished": total > 0 and done >= total
    }

@app.post("/products/compare")
async def run_compare_bulk(ids: list[int], db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.id.in_(ids), Product.image_upload.isnot(None)).all()
    batch_id = str(uuid.uuid4())
    
    # Store total in Redis
    r.set(f"total:{batch_id}", len(products), ex=3600)
    r.set(f"progress:{batch_id}", 0, ex=3600)

    for product in products:
        product.final_image = None
        product.preview_image = None
        run_processing_task.delay(product.id, product.image_upload, batch_id=batch_id)
    db.commit()
    return {"message": f"Processing started for {len(products)} products", "batch_id": batch_id, "total": len(products)}

@app.post("/products/compare-pending")
async def compare_pending(db: Session = Depends(get_db)):
    # Find products that have an image uploaded but haven't been processed yet
    products = db.query(Product).filter(
        Product.image_upload.isnot(None),
        Product.final_image.is_(None)
    ).all()
    
    if not products:
        return {"message": "No pending products to compare", "count": 0, "ids": [], "batch_id": None}
        
    batch_id = str(uuid.uuid4())
    r.set(f"total:{batch_id}", len(products), ex=3600)
    r.set(f"progress:{batch_id}", 0, ex=3600)

    ids = []
    for product in products:
        product.final_image = None
        product.preview_image = None
        run_processing_task.delay(product.id, product.image_upload, batch_id=batch_id)
        ids.append(product.id)
        
    return {"message": f"Started comparison for {len(products)} pending products", "count": len(products), "ids": ids, "batch_id": batch_id}

import zipfile
from fastapi.responses import FileResponse

@app.post("/products/download-zip")
async def download_zip(ids: list[int], db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.id.in_(ids), Product.final_image.isnot(None)).all()
    if not products:
        raise HTTPException(status_code=404, detail="No processed images found")
        
    zip_name = f"storage/all_images_{int(datetime.now().timestamp())}.zip"
    used_names = {}

    with zipfile.ZipFile(zip_name, 'w') as zipf:
        for product in products:
            if os.path.exists(product.final_image):
                qty = product.jumlah_barang or 1
                ext = product.final_image.split('.')[-1]
                safe_no_pesanan = str(product.no_pesanan).replace('/', '-').replace('\\', '-')
                
                for i in range(1, qty + 1):
                    # Always include the index suffix as requested
                    base_name = f"Final_{safe_no_pesanan}_{i}"
                    
                    final_name = f"{base_name}.{ext}"
                    
                    # Handle duplicate names across different products with same order number
                    if final_name in used_names:
                        used_names[final_name] += 1
                        final_name = f"{base_name}({used_names[final_name]}).{ext}"
                    else:
                        used_names[final_name] = 0
                        
                    zipf.write(product.final_image, final_name)
                    
    return FileResponse(zip_name, media_type="application/zip", filename=os.path.basename(zip_name))

import pandas as pd
import io

@app.post("/products/import")
async def import_products(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents)).fillna('')
        
        new_products = []
        for _, row in df.iterrows():
            try:
                # Helper to safely get string value
                def get_str(idx):
                    if idx < len(row):
                        val = row.iloc[idx]
                        return str(val).strip() if val != '' else ''
                    return ''

                # Helper to safely get integer value
                def get_int(idx, default=1):
                    if idx < len(row):
                        val = row.iloc[idx]
                        try:
                            return int(float(val)) if val != '' else default
                        except:
                            return default
                    return default

                p = Product(
                    sku_platform=get_str(1),
                    jumlah_barang=get_int(2),
                    no_pesanan=get_str(3),
                    id_produk=get_str(4),
                    nomor_id=get_str(5),
                    spesifikasi_produk=get_str(6),
                    sku_gambar=get_str(7),
                    nomor_resi=None
                )
                new_products.append(p)
            except Exception as row_err:
                print(f"Error skipping row: {row_err}")
                continue
        
        if new_products:
            db.add_all(new_products)
            db.commit()
            return {"message": f"Successfully imported {len(new_products)} products"}
        else:
            return {"message": "No valid products found in the file"}
            
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# Seed Admin User
def seed_admin():
    try:
        db = SessionLocal()
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                email="admin@example.com",
                hashed_password=get_password_hash("admin123")
            )
            db.add(admin)
            db.commit()
            print("Admin user seeded successfully.")
        db.close()
    except Exception as e:
        print(f"Error seeding admin: {e}")

seed_admin()
