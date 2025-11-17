# Marketing Page Images Guide

## Quick Setup: Adding Professional Images

This guide shows you how to add construction, field work, and team images to your marketing page to make it more engaging.

---

## Step 1: Prepare Your Images

### Recommended Image Types:
1. **Hero Background** - Construction crew on job site, field workers answering calls
2. **CTA Background** - Team celebrating, contractors with equipment, busy office

### Image Specifications:
- **Format:** JPG or WebP (for best performance)
- **Resolution:** 1920x1080 or higher
- **File Size:** Under 500KB (compress at https://tinypng.com)
- **Aspect Ratio:** 16:9 or wider

---

## Step 2: Add Images to Your Project

Upload your images to: `/frontend/public/`

Example filenames:
```
/frontend/public/hero-construction.jpg
/frontend/public/team-work.jpg
/frontend/public/field-service.jpg
```

---

## Step 3: Enable Images in marketing.html

### Option A: Hero Section Background

Find this section in `/frontend/public/marketing.html` (around line 194):

```css
/* Hero Section */
.hero {
    padding: 160px 24px 120px;
    max-width: 1280px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
```

**UNCOMMENT and UPDATE:**

```css
/* Hero Section */
.hero {
    padding: 160px 24px 120px;
    max-width: 1280px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
    /* Replace the gradient with image */
    background-image:
      linear-gradient(rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.95)),
      url('/hero-construction.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
}
```

### Option B: CTA Section Background

Find this section (around line 1166):

```css
/* CTA Section */
.cta-section {
    padding: 120px 24px;
    background: #1e293b;
    text-align: center;
    position: relative;
    overflow: hidden;
```

**UNCOMMENT and UPDATE:**

```css
/* CTA Section */
.cta-section {
    padding: 120px 24px;
    background: #1e293b;
    text-align: center;
    position: relative;
    overflow: hidden;
    background-image:
      linear-gradient(rgba(30, 41, 59, 0.88), rgba(30, 41, 59, 0.92)),
      url('/team-work.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
}
```

---

## Step 4: Test Your Changes

1. Save `marketing.html`
2. Refresh your browser at `http://localhost:5173/`
3. Check that images load and text remains readable

### Troubleshooting:

**Image not showing?**
- Check file path: Image should be in `/frontend/public/`
- Check filename matches exactly (case-sensitive)
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)

**Text hard to read?**
- Increase overlay opacity: Change `0.92` to `0.95`
- Darken overlay: Change `rgba(248, 250, 252, ...)` to `rgba(0, 0, 0, ...)`

---

## Recommended Free Image Sources

### For Construction/Field Work:
- **Unsplash:** https://unsplash.com/s/photos/construction-workers
- **Pexels:** https://www.pexels.com/search/construction-team/
- **Pixabay:** https://pixabay.com/images/search/field-service/

### Search Terms:
- "construction team job site"
- "field service workers phone"
- "contractors equipment"
- "construction crew planning"
- "professional team office"

---

## Current Marketing Page Improvements (Completed)

✅ **Hero Section:** Emphasizes plug-and-play solution with ElevenLabs + n8n
✅ **Mobile Buttons:** Properly centered on all screen sizes
✅ **Critical Integrations:** ElevenLabs and n8n highlighted as built-in features
✅ **Attention-Grabbing CTA:** "Never Miss Another Call. Automate Everything."
✅ **Image Placeholders:** Ready for your professional photos
✅ **Sidebar Icons:** Fixed alignment when collapsed

---

## Next Steps

1. Find 2-3 high-quality images showing:
   - Construction/field workers in action
   - Team using phones/devices on job sites
   - Professional service providers

2. Upload to `/frontend/public/`

3. Uncomment CSS sections above

4. Adjust overlay opacity if needed

**Need help?** All instructions are in the comments within `marketing.html`!
