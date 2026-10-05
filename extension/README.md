# ToolHub Chrome extension

A tiny popup with search over every ToolHub PDF tool. It requests **no permissions** — it only opens tool pages in a new tab.

```bash
SITE_URL=https://your-site.example npx tsx scripts/build-extension.ts   # regenerates tools.json from the registry
```
Load it: `chrome://extensions` → Developer mode → **Load unpacked** → select this `extension/` folder.
To publish, zip the folder and upload it in the Chrome Web Store developer dashboard.
