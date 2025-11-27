# App Icons

This directory contains the PWA app icons for VoiceNow CRM.

## Required Icons

You need to create the following icon sizes:
- icon-16x16.png
- icon-32x32.png
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## How to Generate Icons

You can use one of these methods:

### Option 1: Online Tool (Easiest)
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo/brand image (at least 512x512px)
3. Download the generated icon pack
4. Replace the files in this directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first: brew install imagemagick (Mac)
# Then run from your logo file:

convert your-logo.png -resize 16x16 icon-16x16.png
convert your-logo.png -resize 32x32 icon-32x32.png
convert your-logo.png -resize 72x72 icon-72x72.png
convert your-logo.png -resize 96x96 icon-96x96.png
convert your-logo.png -resize 128x128 icon-128x128.png
convert your-logo.png -resize 144x144 icon-144x144.png
convert your-logo.png -resize 152x152 icon-152x152.png
convert your-logo.png -resize 192x192 icon-192x192.png
convert your-logo.png -resize 384x384 icon-384x384.png
convert your-logo.png -resize 512x512 icon-512x512.png
```

### Option 3: Use Figma/Photoshop
Export your logo at each size listed above.

## Temporary Placeholder

For now, the PWA will work without icons, but browsers will show a default icon.
Add your branded icons as soon as possible for the best user experience!
