try:
    from main import app
    print("Application imported successfully.")
except Exception as e:
    import traceback
    traceback.print_exc()
