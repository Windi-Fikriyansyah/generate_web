from main import engine, Base, SessionLocal, User, get_password_hash
import sys

def reset_database():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables with updated schema...")
    Base.metadata.create_all(bind=engine)
    
    print("Seeding admin user...")
    db = SessionLocal()
    try:
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("admin123")
        )
        db.add(admin)
        db.commit()
        print("Admin user seeded: admin@example.com / admin123")
    except Exception as e:
        print(f"Error seeding admin: {e}")
    finally:
        db.close()
    print("Database reset complete.")

if __name__ == "__main__":
    reset_database()
