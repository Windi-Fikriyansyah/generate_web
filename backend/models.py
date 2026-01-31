from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, BigInteger, func
from database import Base

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
