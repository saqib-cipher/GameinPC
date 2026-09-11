# GameinPC - Professional Mobile Mirror & Keymapping Controller for PC

**GameinPC** is a high-performance Windows PC software that allows you to mirror and control any physical Android mobile device using keyboard and mouse (or gamepad controller) with **zero emulator environment** and **zero emulator detection/ban risk**.

---

## 📥 Installation & Download (.exe)

You can run **GameinPC** directly on Windows without installing Node.js, Python, or Android Studio! All required dependencies (`adb`, `scrcpy`, FFmpeg) are pre-bundled inside the `.exe`.

### Download Executable (`.exe`)
Download the latest release from **[GitHub Releases](https://github.com/saqib-cipher/GameinPC/releases/latest)**:

- **`GameinPC-Setup-1.0.0.exe` (Installer)**: Standard Windows setup installer (NSIS) with Desktop & Start Menu shortcuts.
- **`GameinPC-Portable-1.0.0.exe` (Portable)**: Standalone single `.exe` file requiring **no installation**—just double-click to run!

---

## Key Features

1. **Zero-Emulator Native Android Gaming**:
   - Runs directly on your physical Android device via **USB Debugging** or **Wireless Debugging (Wi-Fi)**.
   - Games (Free Fire Max, BGMI / PUBG Mobile, Call of Duty: Mobile, Genshin Impact, etc.) detect a genuine physical phone—no emulator matchmaking segregation!

2. **Ultra-Low Latency Screen Mirroring**:
   - Bundled with high-performance `scrcpy` (v4.1) hardware-accelerated video streaming (`Direct3D 11 / OpenGL`).
   - Supports 60 FPS, 90 FPS, and 120 FPS high refresh rates with sub-10ms latency.
   - Screen-off mode: powers off the phone screen while playing on PC to preserve battery life and eliminate overheating.

3. **Complete Emulator-Grade Mouse & Keyboard Controls**:
   - **FPS Aim & Shooting Mode (Pan)**: Smooth 360° mouse camera look around (Pointer Lock) with customizable X & Y sensitivity, mouse acceleration toggle, suspend key (`X`), and left-click fire button without camera interruptions.
   - **Dynamic Analog WASD (D-Pad)**: 8-way and radial analog joystick simulation with adjustable radius, speed, and activation curve.
   - **Rapid Fire (TapRepeat)**: Configurable auto-tap clicker (up to 30 taps/sec).
   - **Macro Script Runner**: Interprets sequences like `tap 2.69 62.94`, `wait 0.5`, `swipe 10 20 80 90 200`.
   - **Free Look**: Hold `Alt` to freely rotate camera without altering movement direction.
   - **Multi-Touch Engine**: Up to 10 simultaneous virtual touch pointers tracked and dispatched concurrently without conflict.

4. **100% BlueStacks & MSI App Player `.cfg` Compatibility**:
   - Direct Import & Export of BlueStacks/MSI `.cfg` keymap profiles (e.g., `com.dts.freefiremax.cfg`).
   - Built-in presets for **Free Fire Max**, **BGMI / PUBG Mobile**, **Call of Duty: Mobile**, and **Genshin Impact**.

5. **Material 3 Expressive Visual Controls Editor**:
   - Interactive on-screen key overlay with live press feedback, opacity slider, and scale slider.
   - Visual sidebar with draggable widgets: Tap spot, Repeated tap, D-pad, Aim & pan, Free look, Script, Swipe, Zoom, Tilt, MOBA D-Pad, and MOBA Skill pad.

6. **Wireless Debugging Manager**:
   - Android 11+ Wireless Debugging Pairing (IP, Port, 6-digit Pairing Code).
   - Direct TCP/IP Wi-Fi connection.
   - 1-Click USB to Wi-Fi mode switch (`adb tcpip 5555`).

---

## Connecting Your Android Device

### Option A: USB Debugging (Fastest)
1. On your phone, go to **Settings &rarr; About phone** and tap **Build number** 7 times to enable Developer Options.
2. Go to **Settings &rarr; Developer options** and turn ON **USB debugging**.
3. Plug in your phone via USB cable. Accept the "Allow USB debugging" prompt on your phone screen.
4. GameinPC will automatically detect your phone in the top bar! Click **Start Mirror & Play Game**.

### Option B: Wireless Debugging (Cable-Free)
1. Connect your phone and PC to the same Wi-Fi network.
2. In GameinPC, click the **Wireless Debugging** button in the top bar.
3. On Android 11+: Open **Settings &rarr; Developer options &rarr; Wireless debugging &rarr; Pair device with pairing code**.
4. Enter the IP, Port, and 6-digit Pairing Code in GameinPC and click **Pair & Connect**.

---

## 🛠️ Building & Development (For Developers)

### Prerequisites
- Windows 10 / 11
- Node.js (v18+)

### Running from Source
```bash
# Install dependencies
npm install

# Start the application
npm run start

# Or for development with hot reload:
npm run dev
```

### Packaging `.exe` Files
```bash
# Build both Setup Installer & Portable .exe:
npm run dist:all

# Build only Portable .exe:
npm run dist:portable

# Build only Setup Installer:
npm run dist
```
The output `.exe` files will be placed in the `release/` folder.

---

## Default In-Game Controls (Free Fire Max / Pro FPS)

| Action | Key / Button |
| :--- | :--- |
| **Toggle Aim / Shooting Mode** | `Ctrl` |
| **Fire Weapon** | `Left Click` |
| **Aim Down Sights (Scope)** | `Right Click` |
| **Move / Drive (D-Pad)** | `W` `A` `S` `D` |
| **Jump** | `Space` |
| **Crouch** | `C` |
| **Prone** | `Z` |
| **Reload** | `R` |
| **Active Skill** | `E` |
| **Sprint** | `Shift` |
| **Loot Items** | `F`, `G`, `H` |
| **Weapons** | `1`, `2`, `3` |
| **Medkit / Heals** | `4`, `5` |
| **Backpack / Inventory** | `Tab` |
| **Map** | `M` |
| **Suspend Cursor** | `X` (Hold) |
| **Toggle Key Overlay** | `F1` |
