# Web Lighthouse Manager

A basic website that uses the Web Bluetooth API (why does that exist?) to turn HTC Vive SteamVR Lighthouse 1.0 Base Stations on and off, from the comfort of your browser.

I didn't make this for any serious usage, just as a stopgap solution for SteamVR itself not being able to detect them on my end.

Should work on Chrome for Windows, macOS and Android, or any other platform where Web Bluetooth is supported.

## Notes

- Standby takes up to 2 minutes to actually happen.
- The Status is not accurate.
- Valve Index/Lighthouse 2.0 Base Stations are not supported.
- You **must** enable `chrome://flags/#enable-web-bluetooth-new-permissions-backend` for "Load Devices" to work
   - Possible Chrome bug, but on Chrome 111 on Windows 11, I have to open the picker before the device handles actually work.
