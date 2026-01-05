import pandas as pd
from pathlib import Path

# Ścieżki
INPUT = Path("/mnt/user-data/uploads")

# Wczytaj każdy plik
print("Ładowanie plików CSV...\n")

# Student.csv
students = pd.read_csv(INPUT / "Student.csv")
print(f"✓ Student.csv: {len(students)} wierszy")
print(students.head())
print()

# Teacher.csv
teachers = pd.read_csv(INPUT / "Teacher.csv")
print(f"✓ Teacher.csv: {len(teachers)} wierszy")
print(teachers.head())
print()

# Section.csv
sections = pd.read_csv(INPUT / "Section.csv")
print(f"✓ Section.csv: {len(sections)} wierszy")
print(sections.head())
print()

# StudentEnrollment.csv
enrollments = pd.read_csv(INPUT / "StudentEnrollment.csv")
print(f"✓ StudentEnrollment.csv: {len(enrollments)} wierszy")
print(enrollments.head())
print()

# TeacherRoster.csv
rosters = pd.read_csv(INPUT / "TeacherRoster.csv")
print(f"✓ TeacherRoster.csv: {len(rosters)} wierszy")
print(rosters.head())
print()

print("Wszystkie pliki załadowane!")
