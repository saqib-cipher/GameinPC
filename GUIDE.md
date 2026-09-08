# 🚀 Guide: Building & Releasing GameinPC as an `.exe` Software on GitHub

This guide explains step-by-step how to build **GameinPC** as a standalone Windows executable (`.exe`), create a setup installer / portable version, and release it on GitHub so anyone can download and run it with one click.

---

## 📦 What Formats Are Produced?

When you build the project, two standalone executables are generated in the `release/` folder:

1. **`GameinPC-Setup-1.0.0.exe` (Installer)**:
   - Full Windows Installer (NSIS).
   - Allows choosing installation folder, creates Desktop & Start Menu shortcuts, and includes an uninstaller.
2. **`GameinPC-Portable-1.0.0.exe` (Portable Standalone)**:
   - Single standalone `.exe` file.
   - Requires **no installation**—players can put it on a USB drive or anywhere on their PC, double-click, and start playing immediately!

> [!NOTE]
> All necessary tools (including `adb.exe`, `scrcpy.exe`, `scrcpy-server`, and FFmpeg codecs) are **bundled directly inside the `.exe`**. End users do **NOT** need Node.js, Python, or Android Studio installed on their computer.

---

## 🛠️ Method 1: Build the `.exe` Locally on Your PC (Fastest)

You can build the `.exe` directly on your Windows computer with a single command:

### Step 1: Build the Executables
Open your terminal in the `GameinPC` folder and run:

```bash
# Build both Installer and Portable .exe:
npm run dist:all

# Or to build only the Portable .exe:
npm run dist:portable

# Or to build only the Installer:
npm run dist
```

### Step 2: Locate Your Output Files
Once the build finishes (usually takes 30–60 seconds), your ready-to-share files will be in the **`release/`** directory:

```
GameinPC/
└── release/
    ├── GameinPC-Setup-1.0.0.exe      <-- Share this installer
    └── GameinPC-Portable-1.0.0.exe   <-- Share this portable version
```

You can now test it by double-clicking `GameinPC-Portable-1.0.0.exe`!

---

## 🌐 Method 2: Automatic GitHub Release via GitHub Actions

We have configured an automated GitHub Actions workflow (`.github/workflows/release.yml`) for your repository. Whenever you create a release tag, GitHub will automatically compile the `.exe` in the cloud on Windows runners and publish it to your GitHub Releases page!

### Option A: Trigger Release Using Git Tags (Recommended)

Run these 3 commands in your terminal:

```bash
# 1. Commit any recent changes
git add .
git commit -m "release: v1.0.0"
git push origin main

# 2. Create a version tag
git tag v1.0.0

# 3. Push the tag to GitHub
git push origin v1.0.0
```

GitHub Actions will automatically:
1. Spin up a clean Windows machine in the cloud.
2. Build the React frontend and package `GameinPC-Setup-1.0.0.exe` & `GameinPC-Portable-1.0.0.exe`.
3. Create a public release at:  
   👉 **`https://github.com/saqib-cipher/GameinPC/releases`**  
   with direct download links for both `.exe` files!

---

### Option B: Trigger Release Manually from GitHub Website

If you prefer to trigger the build without using tags:

1. Open your repository in your browser: [https://github.com/saqib-cipher/GameinPC](https://github.com/saqib-cipher/GameinPC)
2. Click on the **Actions** tab at the top.
3. In the left sidebar, click **Build and Release Executables**.
4. Click the **Run workflow** dropdown on the right side and click the green **Run workflow** button.
5. When the workflow completes (green checkmark), download the `.exe` files from the workflow artifacts or the Releases page.

---

## 📤 How to Share with Friends & Gamers

Once your `.exe` is generated, you can share it in several ways:

1. **Direct GitHub Releases Link**:
   - Send players the link: `https://github.com/saqib-cipher/GameinPC/releases/latest`
   - They click `GameinPC-Portable-1.0.0.exe` to download and play immediately.

2. **Cloud Storage / Direct Sharing**:
   - Upload `GameinPC-Portable-1.0.0.exe` or `GameinPC-Setup-1.0.0.exe` to **Google Drive**, **MediaFire**, **Mega**, **Discord**, or **Telegram**.

3. **What Players Need to Do**:
   - Plug in their phone with **USB Debugging** enabled (or connect over **Wi-Fi** using the Wireless Debugging button in GameinPC).
   - Launch `GameinPC.exe` & start gaming!
