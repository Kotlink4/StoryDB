# trueCORD Desktop

Electron desktop wrapper for your self-hosted trueCORD server.

Default server:

```text
https://157.22.185.96:8443/
```

The app trusts the self-signed trueCORD certificate only for the configured trueCORD hosts and grants microphone/camera/screen permissions only to those hosts.

## Run

```powershell
npm install
npm start
```

## Use Another Server

```powershell
$env:TRUECORD_URL="https://157.22.185.96:8443/"
npm start
```

## Build Windows Installer

```powershell
npm run dist
```

Output will be written to `dist/`.

