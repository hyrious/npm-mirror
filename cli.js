#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function deleteText(text, index, length) {
  return text.slice(0, index) + text.slice(index + length).trimStart()
}

function readFileSync(file) {
  try { return fs.readFileSync(file, 'utf8') }
  catch { return '' }
}

function findPackageLockFile(dir) {
  const fullPath = path.join(dir, 'package-lock.json')
  if (fs.existsSync(fullPath)) {
    return fullPath
  } else {
    const parent = path.dirname(dir)
    if (parent != dir) {
      return findPackageLockFile(parent)
    } else {
      throw new Error('Not found package-lock.json')
    }
  }
}

async function main(url, dir = process.cwd()) {
  const root = path.resolve(dir)

  // Resolve registry URL.
  if (typeof url == 'string' && url.length > 2) {
    // Use it.
  } else if (url = process.env.NPM_MIRROR_REGISTRY) {
    // Use it.
  } else {
    url = 'http://registry.npmmirror.com'
  }
  // Normalize the URL.
  if (!url.includes('://')) {
    url = 'https://' + url
  }
  if (url.endsWith('/')) {
    url = url.slice(0, -1)
  }
  // Always use HTTPS in lockfile, but skip addresses like in a local network.
  const url2 = url.replace('http://registry.', 'https://registry.')

  // Resolve package-lock.json.
  const lockFile = findPackageLockFile(root)
  const npmrcFile = path.join(lockFile, '../.npmrc')

  let isUsingMirror = false

  // Check .npmrc.
  const npmrc = readFileSync(npmrcFile)
  const matchLine = npmrc.match(/^registry=(.+)/)
  if (matchLine) {
    const userURL = matchLine[1].trim()
    if (userURL == url) {
      isUsingMirror = true
    } else {
      throw new Error('Using different registry ' + userURL)
    }
  }

  // Check lockfile.
  const contents = readFileSync(lockFile)
  isUsingMirror ||= contents.includes(url2)

  // Reset.
  if (isUsingMirror) {
    console.log('Resetting default registry...')
    // Reset .npmrc.
    if (matchLine) {
      const newNPMRC = deleteText(npmrc, matchLine.index, matchLine[0].length)
      if (newNPMRC) {
        fs.writeFileSync(npmrcFile, newNPMRC)
        console.log('Updated', path.relative(root, npmrcFile))
      } else {
        fs.unlinkSync(npmrcFile)
        console.log('Deleted', path.relative(root, npmrcFile))
      }
    }
    // Reset package-lock.json.
    const newContents = contents.replaceAll(url2, 'https://registry.npmjs.org')
    if (newContents) {
      fs.writeFileSync(lockFile, newContents)
      console.log('Updated', path.relative(root, lockFile))
    }
  }

  // Use mirror.
  else {
    console.log('Enabling custom registry:', url)
    // Update .npmrc.
    const nl = npmrc.includes('\r') ? '\r\n' : '\n'
    const line = `registry=${url}${nl}`
    const newNPMRC = npmrc ? [npmrc.trimEnd(), line].join(nl) : line
    fs.writeFileSync(npmrcFile, newNPMRC)
    console.log('Updated', path.relative(root, npmrcFile))
    // Update package-lock.json.
    const newContents = contents.replaceAll('https://registry.npmjs.org', url2)
    if (newContents) {
      fs.writeFileSync(lockFile, newContents)
      console.log('Updated', path.relative(root, lockFile))
    }
  }

  console.log('Done.')
}

main(process.argv[3], process.argv[3]).catch(err => {
  console.error(err + '')
  process.exitCode = 1
})
