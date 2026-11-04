# Sanchikakrmik (संचिकाकर्मिक)
### *Intelligent High-Performance Storage Organizer • Developed by ANOOP KUMAR*

[![Platform](https://img.shields.io/badge/Platform-Android%205.0%2B%20(API%2021--35)-green.svg)](https://developer.android.com)
[![Language](https://img.shields.io/badge/Language-Kotlin%20100%25-blue.svg)](https://kotlinlang.org)
[![Refresh Rate](https://img.shields.io/badge/Display-Up%20to%20240Hz-ff007f.svg)](#-240hz-refresh-rate-engine)
[![Security](https://img.shields.io/badge/Security-100%25%20Offline%20%7C%20Zero%20Internet%20Access-emerald.svg)](#-security--privacy-first)
[![Author](https://img.shields.io/badge/Author-ANOOP%20KUMAR-orange.svg)](#)

---

## ⚡ Overview

**Sanchikakrmik** (संचिकाकर्मिक) is a native, ultra-responsive Android file organization application written in **100% Kotlin**. It eliminates chaotic storage clutter by automatically sorting files from any source directory (such as `Download`, `DCIM`, or custom folders) into customizable category-specific destination folders with zero data loss.

Built with an ultra-smooth **240Hz gaming-grade refresh rate engine**, **GPU hardware acceleration**, and a cyberpunk **Chroma RGB animated interface**, Sanchikakrmik delivers instant, fluid folder management.

---

## 🚀 Key Features

### 1. In-App Direct Folder Browser (Privacy Block Bypass)
- **Eliminates Android SAF Privacy Restrictions:** On Android 11+, Google blocks users from picking `Download` or storage root via the system file picker (*"Can't use this folder: To protect your privacy, choose another folder"*).
- **Direct All-Files Navigation:** Sanchikakrmik provides a built-in direct folder browser with breadcrumbs, quick shortcuts (`Download`, `DCIM`, `Pictures`, `Music`, `Movies`, `Documents`), and a `+ New Folder` creator.

### 2. Destination Folder Selection Underneath Each Category
- Every file category features a dedicated destination folder selector **directly underneath its card**:
  - **Images** (`.jpg`, `.png`, `.webp`, `.heic`, `.gif`, etc.) ➔ Default: `/Pictures`
  - **Documents** (`.pdf`, `.docx`, `.txt`, `.epub`, `.md`, etc.) ➔ Default: `/Documents`
  - **Videos** (`.mp4`, `.mkv`, `.mov`, `.webm`, etc.) ➔ Default: `/Movies`
  - **Audio** (`.mp3`, `.wav`, `.flac`, `.aac`, `.m4a`, etc.) ➔ Default: `/Music`
  - **Archives** (`.zip`, `.rar`, `.7z`, `.tar.gz`, etc.) ➔ Default: `/Archives`
  - **Spreadsheets / Data** (`.xlsx`, `.csv`, `.json`, `.xml`, etc.)
  - **Apps / APKs** (`.apk`, `.xapk`, `.aab`)
  - **Code / Development** (`.py`, `.kt`, `.js`, `.html`, `.cpp`, etc.)
  - **Miscellaneous**
- Files are only routed to the folders you choose—no unwanted directories are auto-created!

### 3. ⚡ 240Hz Refresh Rate Engine
- Automatic display mode querying (`display.supportedModes`) locks to the highest supported refresh rate (up to 240Hz on supported gaming panels like ROG Phone, RedMagic, etc.).
- Hardware-accelerated GPU composition (`LAYER_TYPE_HARDWARE` & `FLAG_HARDWARE_ACCELERATED`) ensures silky-smooth 240fps VSync interactions.

### 4. 🌈 Chroma RGB Lighting Branding
- **"DEVELOPED BY ANOOP KUMAR"** rendered in continuous 360° chromatic RGB flowing border lighting and shifting holographic neon gradients.

### 5. 🛡️ Security & Privacy First
- **Zero Internet Permissions:** The application manifest contains **no internet access permissions** (`android.permission.INTERNET` is absent). All processing runs strictly offline on your device.
- **Production Developer Signing:** Signed with a dedicated 2048-bit RSA Developer Certificate for **ANOOP KUMAR** (`CN=ANOOP KUMAR, OU=Sanchikakrmik Apps, O=Anoop Kumar, L=Delhi, ST=Delhi, C=IN`).
- **`debuggable="false"` & `allowBackup="false"`:** Play Protect hardened to prevent unauthorized ADB data extraction.

### 6. Safe Duplicate Handling & One-Click Undo
- **Collision-Safe Renaming:** If a file with the same name exists in the target folder, Sanchikakrmik renames it safely as `file (1).ext`, `file (2).ext`—ensuring zero accidental overwrites.
- **1-Click Undo Stack:** Every file move is tracked and can be reverted immediately with a single tap.
- **Dry-Run Mode:** Simulate sorting without moving a single byte.

---

## 📦 Download & Installation

1. Download the pre-built, production-signed APK:
   - **[Download Sanchikakrmik.apk](./Sanchikakrmik.apk)** (1.03 MB)
2. On your Android phone, tap the APK and select **Install**.
3. Grant **All Files Access** when prompted to allow direct folder management.
4. Tap **Choose Folder** for your source (e.g. `Download`), customize any destination folders underneath each category, and tap **⚡ Transfer & Organize Files**!

---

## 🛠️ Project Structure

```
Sanchikakrmik/
├── Sanchikakrmik.apk                # Production Signed APK (1.03 MB)
├── Sanchikakrmik_Signed_Debug.apk   # Signed Debug APK (1.37 MB)
├── index.html                       # Web UI Controller (Browser Preview)
├── style.css                        # 240Hz Fluid Cyberpunk / RGB Styling
├── app.js                           # UI Logic & Coroutine Bridge
├── file-sorter-android/             # Android Studio / Gradle Project
│   ├── app/
│   │   ├── build.gradle             # Build config, signing, dependencies
│   │   └── src/main/
│   │       ├── AndroidManifest.xml  # Hardened manifest & permissions
│   │       ├── java/com/autosort/filesorter/
│   │       │   └── MainActivity.kt  # Kotlin core logic, 240Hz engine, file IO
│   │       ├── res/values/strings.xml
│   │       └── assets/              # Embedded Web UI assets
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradle.properties
└── README.md
```

---

## 💻 Tech Stack & Architecture

- **Core Language:** Kotlin 2.0.20
- **Android Gradle Plugin:** AGP 8.7.2
- **Coroutines:** `kotlinx-coroutines-android:1.8.1` (`Dispatchers.IO` background processing)
- **Document Framework:** `androidx.documentfile:1.0.1` + Direct `java.io.File` NIO
- **Hardware Acceleration:** Android `WindowManager` + CSS3 3D Hardware Matrix Composite

---

## 👤 Credits

- **Concept, Design & Development:** **ANOOP KUMAR**
- **License:** MIT License (or custom license as specified by author)

