# System Ładowania Danych Szkolnych

System do wczytywania i analizy danych szkolnych z plików CSV oraz PDF.

## Struktura katalogów

```
/mnt/user-data/
├── uploads/          # Katalog wejściowy dla plików danych
│   ├── Student.csv
│   ├── Teacher.csv
│   ├── Section.csv
│   ├── StudentEnrollment.csv
│   ├── TeacherRoster.csv
│   └── przypisania.pdf
└── outputs/          # Katalog wyjściowy dla wyników
```

## Pliki w projekcie

### 1. `load_school_data.py`
Skrypt Pythona do wczytywania danych szkolnych z linii poleceń.

**Funkcjonalność:**
- Wczytuje 5 plików CSV z danymi szkolnymi
- Sprawdza istnienie pliku PDF z przypisaniami
- Wyświetla podstawowe statystyki dla każdego zbioru danych
- Generuje podsumowanie w pliku tekstowym

**Użycie:**
```bash
python load_school_data.py
```

**Wynik:**
- Podsumowanie wyświetlane w konsoli
- Plik `data_summary.txt` zapisany w katalogu `/mnt/user-data/outputs/`

### 2. `school_data_analysis.ipynb`
Jupyter Notebook do interaktywnej analizy danych.

**Funkcjonalność:**
- Wczytywanie wszystkich plików danych
- Wyświetlanie podstawowych statystyk
- Analiza relacji między tabelami
- Wizualizacja danych
- Eksport wyników do CSV

**Użycie:**
```bash
jupyter notebook school_data_analysis.ipynb
```

## Wymagane pliki danych

### Pliki CSV

1. **Student.csv** - Dane studentów
2. **Teacher.csv** - Dane nauczycieli
3. **Section.csv** - Dane sekcji/klas
4. **StudentEnrollment.csv** - Zapisy studentów do sekcji
5. **TeacherRoster.csv** - Przypisania nauczycieli do sekcji

### Plik PDF

- **przypisania.pdf** - Dokument z przypisaniami

## Instalacja wymaganych pakietów

```bash
pip install pandas matplotlib seaborn jupyter
```

Lub użyj pliku `requirements.txt`:

```bash
pip install -r requirements.txt
```

## Przygotowanie danych

1. Upewnij się, że katalogi istnieją:
```bash
mkdir -p /mnt/user-data/uploads /mnt/user-data/outputs
```

2. Skopiuj pliki danych do katalogu `/mnt/user-data/uploads/`:
```bash
cp Student.csv Teacher.csv Section.csv StudentEnrollment.csv TeacherRoster.csv przypisania.pdf /mnt/user-data/uploads/
```

## Przykłady użycia

### Szybkie wczytanie danych (Python)

```python
import pandas as pd
from pathlib import Path

INPUT = Path("/mnt/user-data/uploads")
OUTPUT = Path("/mnt/user-data/outputs")

# Wczytaj dane
students = pd.read_csv(INPUT / "Student.csv")
teachers = pd.read_csv(INPUT / "Teacher.csv")
sections = pd.read_csv(INPUT / "Section.csv")
enrollments = pd.read_csv(INPUT / "StudentEnrollment.csv")
rosters = pd.read_csv(INPUT / "TeacherRoster.csv")

# Wyświetl pierwsze wiersze
print(students.head())
```

### Użycie gotowego skryptu

```python
from load_school_data import load_school_data

# Załaduj wszystkie dane
data = load_school_data()

# Dostęp do poszczególnych zbiorów
students = data['Student']
teachers = data['Teacher']
sections = data['Section']
enrollments = data['StudentEnrollment']
rosters = data['TeacherRoster']
```

## Struktura danych

Każdy plik CSV powinien zawierać odpowiednie kolumny dla:

- **Student.csv**: ID studenta, imię, nazwisko, etc.
- **Teacher.csv**: ID nauczyciela, imię, nazwisko, etc.
- **Section.csv**: ID sekcji, nazwa, etc.
- **StudentEnrollment.csv**: ID zapisu, ID studenta, ID sekcji, etc.
- **TeacherRoster.csv**: ID, ID nauczyciela, ID sekcji, etc.

## Rozwiązywanie problemów

### Brak plików
Jeśli pliki nie istnieją w katalogu `/mnt/user-data/uploads/`, skrypt wyświetli ostrzeżenie, ale będzie kontynuował działanie.

### Błędy podczas wczytywania
Sprawdź:
- Format plików CSV (kodowanie, separator)
- Czy pliki nie są uszkodzone
- Czy masz uprawnienia do odczytu plików

## Licencja

Ten projekt jest częścią systemu WSR Rekrut.
