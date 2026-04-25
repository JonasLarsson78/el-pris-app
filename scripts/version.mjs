#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dir, '..')

const version = process.argv[2]

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: npm run new:version <version>  (e.g. 1.0.0)')
  process.exit(1)
}

function updateJSON(file, updater) {
  const path = resolve(root, file)
  const json = JSON.parse(readFileSync(path, 'utf8'))
  updater(json)
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n')
  console.log(`✓ ${file}  →  ${version}`)
}

function updateToml(file, key) {
  const path = resolve(root, file)
  let content = readFileSync(path, 'utf8')
  content = content.replace(
    new RegExp(`^(${key}\\s*=\\s*)"[^"]+"`, 'm'),
    `$1"${version}"`
  )
  writeFileSync(path, content)
  console.log(`✓ ${file}  →  ${version}`)
}

updateJSON('package.json', j => { j.version = version })
updateJSON('package-lock.json', j => {
  j.version = version
  if (j.packages?.['']) j.packages[''].version = version
})
updateJSON('src-tauri/tauri.conf.json', j => { j.version = version })
updateToml('src-tauri/Cargo.toml', 'version')

console.log(`\nVersion satt till ${version}`)
