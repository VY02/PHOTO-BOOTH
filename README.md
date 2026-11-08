# Photo booth

A cozy, browser-based photo booth for taking single portraits or classic four-frame photo strips. Choose a look, capture from your camera, and download JPEG copies of your photos.

## Run it

Camera access requires a secure context. The easiest option is to serve this folder from `localhost`:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) and allow camera access when prompted. You can also deploy the files to any static HTTPS host.

## Features

- Live, mirrored camera preview
- Five camera filters
- Single-shot and four-frame strip formats with a countdown
- Download an individual photo or all photos from the current session
- Photos are processed in your browser and are not uploaded

No build step or dependencies are required. Camera access is available only in supported browsers on `localhost` or HTTPS. Photos remain in the current page session; download copies you want to keep before closing the tab.
