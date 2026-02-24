const { generateGalleryHTML } = require('./app-patients-backend/galleryTemplate');
const fs = require('fs');
const path = require('path');

// Mock fs to avoid needing real folders
const originalReaddirSync = fs.readdirSync;
const originalStatSync = fs.statSync;

fs.readdirSync = (path) => ['image.jpg', 'doc.pdf'];
fs.statSync = (path) => ({
    isDirectory: () => false,
    isFile: () => true,
    size: 1024,
    mtime: new Date()
});

try {
    const html = generateGalleryHTML('/test', '/tmp/test');
    console.log("SUCCESS: Generated HTML length:", html.length);
    console.log("First 100 chars:", html.substring(0, 100));
    console.log("Last 100 chars:", html.substring(html.length - 100));
} catch (e) {
    console.error("ERROR:", e);
}
