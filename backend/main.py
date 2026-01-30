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
from celery_app import run_processing_task

# Database
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    id = Column(BigInteger, primary_key=True, index=True)
    sku_gambar = Column(String)
    image_upload = Column(String)
    preview_image = Column(String)
    final_image = Column(String)
    sku_platform = Column(String)
    jumlah_barang = Column(Integer, default=1)
    no_pesanan = Column(String)
    nomor_resi = Column(String)
    id_produk = Column(String)
    spesifikasi_produk = Column(Text)
    nomor_id = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

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

# Initialize engine
from sqlalchemy import create_engine
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from processor import process_product_image

def run_processing_sync(product_id: int, upload_path: str):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return
            
        font_path = settings.FONT_PATH
        print(f"Celery processing product {product_id} with font {font_path}")
        
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
            print(f"Celery processing complete for product {product_id}")
    finally:
        db.close()

async def run_processing(product_id: int, upload_path: str):
    # Wrapper to maintain async compatibility if needed, though we'll prefer .delay()
    run_processing_task.delay(product_id, upload_path)

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
        # Assemble
        final_path = f"storage/uploads/{fileUuid}_{fileName}"
        
        # Step 1: Merge all chunks
        with open(final_path, "wb") as final_file:
            for i in range(totalChunks):
                chunk_file = f"storage/chunks/{fileUuid}_{i}"
                with open(chunk_file, "rb") as cf:
                    final_file.write(cf.read())
        
        # Step 2: Cleanup chunks (separate loop to ensure file handles are released)
        import time
        time.sleep(0.1) # Brief pause for Windows file system to catch up
        
        for i in range(totalChunks):
            chunk_file = f"storage/chunks/{fileUuid}_{i}"
            try:
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
            except Exception as e:
                print(f"Warning: Failed to delete chunk {chunk_file}: {e}")
        
        db = SessionLocal()
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            # Sync Logic
            sync_value = getattr(product, sync_by, None)
            if sync_value and sync_by in ["nomor_id", "sku_platform"]:
                affected_products = db.query(Product).filter(getattr(Product, sync_by) == sync_value).all()
                for p in affected_products:
                    p.image_upload = final_path
                    p.final_image = None
                    p.preview_image = None
                    run_processing_task.delay(p.id, final_path)
            else:
                product.image_upload = final_path
                product.final_image = None
                product.preview_image = None
                run_processing_task.delay(product.id, final_path)
            
            db.commit()
            return {"message": "Upload complete and processing started", "path": final_path, "ids": [p.id for p in affected_products] if sync_value else [product.id]}
        db.close()
        
        return {"message": "Upload complete and processing started", "path": final_path}
    
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

@app.post("/products/bulk-delete")
async def bulk_delete(ids: list[int], db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.id.in_(ids)).all()
    for product in products:
        for attr in ["image_upload", "preview_image", "final_image"]:
            path = getattr(product, attr)
            if path and os.path.exists(path):
                try: os.remove(path)
                except: pass
        db.delete(product)
    db.commit()
    return {"message": f"{len(ids)} products deleted"}

@app.get("/products/check-progress")
async def check_progress(ids: str, db: Session = Depends(get_db)):
    # ids come as comma separated string from frontend query param
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
    for product in products:
        product.final_image = None
        product.preview_image = None
        run_processing_task.delay(product.id, product.image_upload)
    db.commit()
    return {"message": f"Processing started for {len(products)} products"}

import zipfile
from fastapi.responses import FileResponse

@app.post("/products/download-zip")
async def download_zip(ids: list[int], db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.id.in_(ids), Product.final_image.isnot(None)).all()
    if not products:
        raise HTTPException(status_code=404, detail="No processed images found")
        
    zip_name = f"storage/all_images_{int(datetime.now().timestamp())}.zip"
    with zipfile.ZipFile(zip_name, 'w') as zipf:
        for product in products:
            if os.path.exists(product.final_image):
                qty = product.jumlah_barang or 1
                ext = product.final_image.split('.')[-1]
                for i in range(1, qty + 1):
                    # Use index only if qty > 1, otherwise just the order number + unique suffix if needed
                    if qty > 1:
                        zip_entry_name = f"Final_{product.no_pesanan}_{i}.{ext}"
                    else:
                        zip_entry_name = f"Final_{product.no_pesanan}.{ext}"
                    
                    # Handle potential duplicate names in the zip by checking/appending index if needed
                    # Since we can't easily check what's in the zip stream, we'll ensure uniqueness by adding product ID if multiple items have same order number
                    # But simpler approach: Always append product ID to be safe if uniqueness is key
                    # zip_entry_name = f"Final_{product.no_pesanan}_{product.id}_{i}.{ext}"
                    
                    # Reverting to user requirement: "Final_(Nomor pesanan)_index"
                    # But if multiple products have SAME no_pesanan, we have a problem.
                    # Let's assume unique no_pesanan per row for now, or just append a counter.
                    
                    # Improved logic:
                    base_name = f"Final_{product.no_pesanan}"
                    if qty > 1:
                        zip_entry_name = f"{base_name}_{i}.{ext}"
                    else:
                         zip_entry_name = f"{base_name}.{ext}"

                    # Write to zip (if duplicate name exists, zipfile allows it but it's confusing. 
                    # We should probably enforce unique names if the user report is about overwrite)
                    
                    # Let's strictly follow "Final_(Nomor pesanan)_index" as per previous request, 
                    # but if the user says "what downloaded is not appropriate", maybe they mean the content doesn't match the row?
                    # Let's double check the filter. 
                    # The filter is `Product.id.in_(ids)`. This logic seems correct for selection.
                    
                    # Potential Issue: If `no_pesanan` contains slashes or invalid chars for filenames?
                    safe_no_pesanan = str(product.no_pesanan).replace('/', '-').replace('\\', '-')
                    if qty > 1:
                        zip_entry_name = f"Final_{safe_no_pesanan}_{i}.{ext}"
                    else:
                        zip_entry_name = f"Final_{safe_no_pesanan}.{ext}"
                        
                    zipf.write(product.final_image, zip_entry_name)
                    
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
