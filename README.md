# Timeline Drawing Challenge

A simple, beautiful timeline app for tracking daily drawing challenges. Built with vanilla JavaScript - no frameworks, no build step, no dependencies.

## Features

- **Timeline Board**: Responsive card layout with collage previews (1-3 photos per day)
- **Photo Upload**: Click to add photos for each day (Me, Them, Us slots)
- **Save as Image**: Export days as shareable 1080x1350 PNG images
- **Optional Notes**: Add text notes to any day
- **Calendar Picker**: Custom date picker for flexible scheduling
- **Month Navigation**: Browse through your timeline month by month
- **Local Storage**: Everything stays in your browser using IndexedDB
- **Backup/Restore**: Export and import your timeline as JSON

## How to Use

1. **Open** `index.html` in a modern browser
2. **Set up** your timeline (start date, number of days, labels)
3. **Click any day card** to add photos and notes
4. **Click photo slots** to upload images
5. **Right-click photos** to remove them
6. **View cards** to see full images and save as shareable images

## Tech Stack

- Vanilla JavaScript
- CSS Grid & Flexbox
- HTML5 Canvas (for image export)
- IndexedDB (for storage)
- Caveat font (Google Fonts)

## File Structure

```
├── index.html       # Main HTML file
├── app.js          # Timeline logic & UI
├── calendar.js     # Date picker component
├── style.css       # Main styles
├── calendar.css    # Calendar styles
└── vercel.json     # Deployment config
```

## Browser Support

Works in all modern browsers that support:
- ES6+ JavaScript
- CSS Grid
- IndexedDB
- HTML5 Canvas

## Privacy

All data is stored locally in your browser. Nothing is uploaded to any server. Use the Backup feature to save your timeline externally.

## License

Free to use and modify.
