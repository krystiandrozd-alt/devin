# CLAUDE.md

## Project Overview

This repository stores the **WSR Rekrut** Figma design file — a recruitment-related design project. It is a design asset repository, not a software source code project.

## Repository Structure

```
/
├── CLAUDE.md              # This file — guidance for AI assistants
└── WSR Rekrut.make        # Figma design archive (ZIP format)
```

### WSR Rekrut.make

A ZIP archive (Figma `.make` export format) containing:

| File | Description |
|------|-------------|
| `canvas.fig` | Main Figma design canvas |
| `thumbnail.png` | Preview thumbnail of the design |
| `meta.json` | Figma metadata (background color, canvas coordinates) |
| `images/` | Referenced image assets (6 files) |

## Key Facts

- **No build system** — there is no `package.json`, `Makefile`, or equivalent.
- **No source code** — the repo contains only the binary Figma design file.
- **No tests, linters, or CI/CD** — none are configured.
- **No dependencies** — nothing to install.
- **Single branch workflow** — `main` is the primary branch.

## Working with This Repository

### Viewing the Design

Import `WSR Rekrut.make` into [Figma](https://www.figma.com/) (File > Import).

### Inspecting the Archive

The `.make` file is a standard ZIP archive. To list its contents:

```sh
unzip -l "WSR Rekrut.make"
```

To extract:

```sh
unzip "WSR Rekrut.make" -d extracted/
```

## Conventions for AI Assistants

- The `.make` file is a binary asset. Do not attempt to edit it directly.
- Any code or tooling added to this repo should be documented in this file.
- When committing, use clear and descriptive commit messages.
- Avoid committing secrets, credentials, or `.env` files.
