// Generate multi-resolution app icons from public/icon.svg using sharp.
// Output:
//   public/icon.png       — 1024x1024 (electron-builder macOS minimum + general fallback)
//   public/icon@2x.png    — 512x512  (legacy alias)
//   build/icons/{16,32,48,64,128,256,512,1024}x{...}.png
//                         — electron-builder auto-generates icon.icns (mac) and
//                           icon.ico (win) from these when no explicit .icns/.ico
//                           file is present.
//
// Run with: node scripts/generate-icons.js
//   or:    npm run icons

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const SVG = path.join(ROOT, 'public', 'icon.svg')
const OUT_PUBLIC = path.join(ROOT, 'public')
const OUT_BUILD = path.join(ROOT, 'build')
const OUT_ICONS = path.join(ROOT, 'build', 'icons')

const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]

async function ensureDirs() {
  fs.mkdirSync(OUT_BUILD, { recursive: true })
  fs.mkdirSync(OUT_ICONS, { recursive: true })
}

async function renderSvgAt(size) {
  return sharp(SVG, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function writePng(buffer, dest) {
  fs.writeFileSync(dest, buffer)
  console.log(`  ✔ ${path.relative(ROOT, dest)} (${buffer.length} bytes)`)
}

async function generatePngs() {
  for (const size of SIZES) {
    const buf = await renderSvgAt(size)
    await writePng(buf, path.join(OUT_ICONS, `${size}x${size}.png`))
  }
  // public/icon.png = 1024x1024 (electron-builder macOS minimum)
  const big = await renderSvgAt(1024)
  await writePng(big, path.join(OUT_PUBLIC, 'icon.png'))
  // public/icon@2x.png = 512x512 (legacy alias)
  const half = await renderSvgAt(512)
  await writePng(half, path.join(OUT_PUBLIC, 'icon@2x.png'))
}

async function main() {
  console.log('Generating icons from public/icon.svg ...')
  if (!fs.existsSync(SVG)) {
    console.error(`SVG not found: ${SVG}`)
    process.exit(1)
  }
  await ensureDirs()
  await generatePngs()
  console.log('Done.')
  console.log('Note: electron-builder will auto-generate icon.icns + icon.ico')
  console.log('from build/icons/*.png on each platform.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})