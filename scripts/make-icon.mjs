// Rasterizes build/icon.svg into build/icon.ico (multi-size) + build/icon.png.
// Run `npm run icon` after editing the SVG.
import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const svg = readFileSync('build/icon.svg')
const render = (w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng()

const ico = await pngToIco([256, 128, 64, 48, 32, 16].map(render))
writeFileSync('build/icon.ico', ico)
writeFileSync('build/icon.png', render(512))

console.log(`wrote build/icon.ico (${ico.length} bytes) and build/icon.png`)
