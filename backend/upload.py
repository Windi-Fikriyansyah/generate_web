from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import shutil

router = APIRouter(prefix="/upload", tags=["upload"])

CHUNKS_DIR = "storage/chunks"
UPLOAD_DIR = "storage/uploads"

@router.post("/chunk")
async def upload_chunk(
    file: UploadFile = File(...),
    chunkIndex: int = Form(...),
    totalChunks: int = Form(...),
    fileName: str = Form(...),
    fileUuid: str = Form(...),
    product_id: int = Form(...)
):
    chunk_filename = f"{fileUuid}_{chunkIndex}"
    chunk_path = os.path.join(CHUNKS_DIR, chunk_filename)
    
    with open(chunk_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    if chunkIndex == totalChunks - 1:
        # Assemble chunks
        final_filename = f"{uuid.uuid4()}_{fileName}"
        final_path = os.path.join(UPLOAD_DIR, final_filename)
        
        with open(final_path, "wb") as outfile:
            for i in range(totalChunks):
                chunk_i_path = os.path.join(CHUNKS_DIR, f"{fileUuid}_{i}")
                with open(chunk_i_path, "rb") as infile:
                    shutil.copyfileobj(infile, outfile)
                os.remove(chunk_i_path)
                
        return {
            "success": True, 
            "message": "Upload complete", 
            "path": final_path,
            "product_id": product_id
        }
    
    return {"success": True, "message": f"Chunk {chunkIndex} received"}
