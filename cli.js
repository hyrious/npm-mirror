#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function deleteLine(text, index) {
  if (!text) return text
  const endOfLine = text.indexOf('\n', index)
  if (endOfLine >= 0) {
    return text.slice(0, index) + text.slice(endOfLine + 1).trimStart()
  } else {
    return text.slice(0, index).trimEnd()
  }
}

// Returns file content or '' if failed.
function readFile(file) {
  try { return fs.readFileSync(file, 'utf8') }
  catch { return '' }
}

// Returns [lockFilePath, isBun] or ['', false] if not found.
function findLockFile(dir) {
  let fullPath
  if (fs.existsSync(fullPath = path.join(dir, 'package-lock.json'))) {
    return [fullPath, false]
  } else if (fs.existsSync(fullPath = path.join(dir, 'bun.lock'))) {
    return [fullPath, true]
  } else {
    const parent = path.dirname(dir)
    if (parent != dir) {
      return findLockFile(parent)
    }
    return ['', false]
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

  const [lockFile, isBun] = findLockFile(root) || path.join(root, 'package-lock.json')
  const npmrcFile = path.join(lockFile, '../.npmrc')

  let isUsingMirror = false, match, newNpmrc, newLockFile

  // Check .npmrc.
  const originalNpmrc = readFile(npmrcFile)
  if (match = originalNpmrc.match(/^registry=(.+)/m)) {
    const userURL = match[1].trim()
    if (userURL == url) {
      isUsingMirror = true
    } else {
      console.error(`Warning: .npmrc registry URL "${userURL}" does not match the expected URL "${url}".`)
      process.exit(1)
    }
  }

  // Check lockfile.
  const originalLockFile = readFile(lockFile)
  isUsingMirror ||= originalLockFile.includes(url2)

  // Reset lockfile and .npmrc.
  if (isUsingMirror) {
    console.info('Resetting default registry...')
    // Reset .npmrc.
    if (match) {
      if (newNpmrc = deleteLine(originalNpmrc, match.index)) {
        fs.writeFileSync(npmrcFile, newNpmrc)
        console.info('Updated', path.relative(root, npmrcFile))
      } else {
        fs.unlinkSync(npmrcFile)
        console.info('Deleted', path.relative(root, npmrcFile))
      }
    }
    // Reset lockfile.
    if (isBun) {
      const regex = new RegExp(`"${url2.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^"]+)"`, 'g')
      newLockFile = originalLockFile.replace(regex, '""')
    } else {
      newLockFile = originalLockFile.replaceAll(url2, 'https://registry.npmjs.org')
    }
    if (newLockFile !== originalLockFile) {
      fs.writeFileSync(lockFile, newLockFile)
      console.info('Updated', path.relative(root, lockFile))
    }
  }

  // Use mirror.
  else {
    console.info('Enabling custom registry:', url)
    // Update .npmrc.
    const nl = originalNpmrc.includes('\r') ? '\r\n' : '\n'
    const line = `registry=${url}${nl}`
    newNpmrc = originalNpmrc ? [originalNpmrc.trimEnd(), line].join(nl) : line
    fs.writeFileSync(npmrcFile, newNpmrc)
    console.info('Updated', path.relative(root, npmrcFile))
    // Update package-lock.json.
    if (isBun) {
      console.info('Does not support updating bun.lock yet.')
      console.info('You can enable the mirror by setting NPM_CONFIG_REGISTRY=' + url + ' in your environment.')
    } else {
      newLockFile = originalLockFile.replaceAll('https://registry.npmjs.org', url2)
      fs.writeFileSync(lockFile, newLockFile)
      console.info('Updated', path.relative(root, lockFile))
    }
  }

  console.info('Done.')
}

if (!process.env.CI) main(process.argv[2], process.argv[3]).catch(err => {
  console.error(err + '')
  process.exitCode = 1
})
