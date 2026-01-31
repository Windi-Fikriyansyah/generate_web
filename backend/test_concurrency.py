import requests
import time
import os
import threading

API_URL = "http://localhost:8001"

def upload_chunk(file_uuid, chunk_index, total_chunks, data):
    # Simulate a chunk upload
    files = {'file': data}
    payload = {
        'chunkIndex': chunk_index,
        'totalChunks': total_chunks,
        'fileName': 'test_large.jpg',
        'fileUuid': file_uuid,
        'product_id': 1, # Ensure product ID 1 exists or change to valid ID
        'sync_by': 'nomor_id'
    }
    start = time.time()
    try:
        res = requests.post(f"{API_URL}/upload-chunk", files=files, data=payload)
        elapsed = time.time() - start
        print(f"Chunk {chunk_index} uploaded in {elapsed:.4f}s. Status: {res.status_code}")
        if chunk_index == total_chunks - 1:
            print(f"Final response: {res.json()}")
    except Exception as e:
        print(f"Error uploading chunk {chunk_index}: {e}")

def simulate_upload():
    file_uuid = f"test_{int(time.time())}"
    # Simulate 5MB chucks, total 20MB (4 chunks)
    chunk_size = 1024 * 1024 # 1MB for test
    total_chunks = 5
    
    threads = []
    print("Starting upload simulation...")
    for i in range(total_chunks):
        # Create dummy data
        data = os.urandom(chunk_size)
        t = threading.Thread(target=upload_chunk, args=(file_uuid, i, total_chunks, data))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
    print("Upload simulation finished.")

if __name__ == "__main__":
    simulate_upload()
