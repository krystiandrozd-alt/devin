#!/usr/bin/env python3
"""
Skrypt pomocniczy do przesyłania plików CSV
"""
import os
from pathlib import Path

UPLOAD_DIR = Path("/mnt/user-data/uploads")

print("=" * 70)
print("INSTRUKCJA PRZESYŁANIA PLIKÓW CSV")
print("=" * 70)
print()
print("Aby przesłać swoje pliki CSV, masz kilka opcji:")
print()
print("OPCJA 1: Skopiuj pliki z innego katalogu")
print("-" * 70)
print("Jeśli Twoje pliki są już na tym komputerze, użyj:")
print()
print(f"  cp /ścieżka/do/Student.csv {UPLOAD_DIR}/")
print(f"  cp /ścieżka/do/Teacher.csv {UPLOAD_DIR}/")
print(f"  cp /ścieżka/do/Section.csv {UPLOAD_DIR}/")
print(f"  cp /ścieżka/do/StudentEnrollment.csv {UPLOAD_DIR}/")
print(f"  cp /ścieżka/do/TeacherRoster.csv {UPLOAD_DIR}/")
print(f"  cp /ścieżka/do/przypisania.pdf {UPLOAD_DIR}/")
print()
print("OPCJA 2: Utwórz pliki bezpośrednio")
print("-" * 70)
print("Możesz edytować pliki bezpośrednio w:")
print(f"  {UPLOAD_DIR}/")
print()
print("OPCJA 3: Sprawdź aktualne pliki")
print("-" * 70)
print(f"Aktualne pliki w {UPLOAD_DIR}:")
print()

if UPLOAD_DIR.exists():
    files = list(UPLOAD_DIR.glob("*"))
    if files:
        for f in sorted(files):
            size = f.stat().st_size
            print(f"  ✓ {f.name} ({size} bajtów)")
    else:
        print("  (pusty katalog)")
else:
    print("  (katalog nie istnieje)")

print()
print("=" * 70)
print("Po przesłaniu plików uruchom:")
print("  python simple_load.py")
print("=" * 70)
