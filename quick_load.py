import pandas as pd
from pathlib import Path

INPUT = Path("/mnt/user-data/uploads")

# Załaduj wszystkie pliki na raz do słownika
data = {
    'students': pd.read_csv(INPUT / "Student.csv"),
    'teachers': pd.read_csv(INPUT / "Teacher.csv"),
    'sections': pd.read_csv(INPUT / "Section.csv"),
    'enrollments': pd.read_csv(INPUT / "StudentEnrollment.csv"),
    'rosters': pd.read_csv(INPUT / "TeacherRoster.csv")
}

# Wyświetl podsumowanie
for name, df in data.items():
    print(f"{name}: {len(df)} wierszy, {len(df.columns)} kolumn")
    print(f"  Kolumny: {list(df.columns)}")
    print()

# Teraz możesz używać:
# data['students']
# data['teachers']
# itd.
