import pandas as pd
from pathlib import Path
import sys

INPUT = Path("/mnt/user-data/uploads")
OUTPUT = Path("/mnt/user-data/outputs")

def load_school_data():
    """
    Load school data files: Student.csv, Teacher.csv, Section.csv,
    StudentEnrollment.csv, TeacherRoster.csv, and przypisania.pdf
    """
    print("=" * 60)
    print("ŁADOWANIE DANYCH SZKOLNYCH")
    print("=" * 60)
    print()

    # Lista plików CSV do wczytania
    csv_files = [
        "Student.csv",
        "Teacher.csv",
        "Section.csv",
        "StudentEnrollment.csv",
        "TeacherRoster.csv"
    ]

    # Słownik do przechowywania załadowanych danych
    data = {}

    # Wczytaj pliki CSV
    print("Wczytywanie plików CSV:")
    print("-" * 60)

    for csv_file in csv_files:
        file_path = INPUT / csv_file

        if file_path.exists():
            try:
                df = pd.read_csv(file_path)
                data[csv_file.replace('.csv', '')] = df
                print(f"✓ {csv_file}: {len(df)} wierszy, {len(df.columns)} kolumn")
                print(f"  Kolumny: {', '.join(df.columns.tolist())}")
                print()
            except Exception as e:
                print(f"✗ Błąd przy wczytywaniu {csv_file}: {str(e)}")
                print()
        else:
            print(f"⚠ Plik {csv_file} nie istnieje w katalogu {INPUT}")
            print()

    # Sprawdź plik PDF
    print("Sprawdzanie pliku PDF:")
    print("-" * 60)
    pdf_file = INPUT / "przypisania.pdf"

    if pdf_file.exists():
        file_size = pdf_file.stat().st_size
        print(f"✓ przypisania.pdf: {file_size} bajtów")
        print(f"  Ścieżka: {pdf_file}")
    else:
        print(f"⚠ Plik przypisania.pdf nie istnieje w katalogu {INPUT}")

    print()
    print("=" * 60)
    print("PODSUMOWANIE ZAŁADOWANYCH DANYCH")
    print("=" * 60)
    print(f"Załadowano {len(data)} plików CSV")

    # Wyświetl podstawowe statystyki dla każdego zbioru danych
    for name, df in data.items():
        print()
        print(f"{name}:")
        print(f"  - Liczba wierszy: {len(df)}")
        print(f"  - Liczba kolumn: {len(df.columns)}")
        print(f"  - Pierwsze 5 wierszy:")
        print(df.head().to_string(index=False))

    return data

if __name__ == "__main__":
    # Upewnij się, że katalogi istnieją
    INPUT.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)

    # Załaduj dane
    school_data = load_school_data()

    # Zapisz podsumowanie do pliku
    summary_file = OUTPUT / "data_summary.txt"
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("PODSUMOWANIE DANYCH SZKOLNYCH\n")
        f.write("=" * 60 + "\n\n")

        for name, df in school_data.items():
            f.write(f"{name}:\n")
            f.write(f"  Liczba wierszy: {len(df)}\n")
            f.write(f"  Liczba kolumn: {len(df.columns)}\n")
            f.write(f"  Kolumny: {', '.join(df.columns.tolist())}\n")
            f.write("\n")

    print()
    print(f"Podsumowanie zapisano do: {summary_file}")
