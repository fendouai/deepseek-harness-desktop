/** Prepare the target-specific Node sidecar and deploy the built dsh runtime. */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(desktopRoot, '../..')
const tauriRoot = join(desktopRoot, 'src-tauri')
const runtimeRoot = join(tauriRoot, 'runtime')
const binariesRoot = join(tauriRoot, 'binaries')

const target = process.env.DSH_DESKTOP_TARGET ?? commandOutput('rustc', ['--print', 'host-tuple'])
const windowsTarget = target.includes('windows')
const sourceNode = process.env.DSH_NODE_BINARY === undefined
  ? officialNodeBinary(target)
  : resolve(process.env.DSH_NODE_BINARY)
const sidecarName = `dsh-node-${target}${windowsTarget ? '.exe' : ''}`
const sidecarPath = join(binariesRoot, sidecarName)

if (!existsSync(sourceNode)) throw new Error(`desktop prepare: Node executable not found at ${sourceNode}`)

run('pnpm', ['run', 'build'], repositoryRoot)
rmSync(runtimeRoot, { recursive: true, force: true })
mkdirSync(runtimeRoot, { recursive: true })
// Modern deploy materializes workspace packages instead of leaving links back
// into the checkout. Its isolated install does not inherit the workspace's
// allowBuilds map, so the already-reviewed dependency closure must opt in again.
run('pnpm', [
  '--config.inject-workspace-packages=true',
  '--config.dangerously-allow-all-builds=true',
  '--config.node-linker=hoisted',
  '--filter', '@deepseek-ai/dsh', 'deploy', '--prod', runtimeRoot,
], repositoryRoot)

const entry = join(runtimeRoot, 'lib', 'bin.js')
if (!existsSync(entry)) throw new Error(`desktop prepare: deployed dsh entry missing at ${entry}`)

mkdirSync(binariesRoot, { recursive: true })
copyFileSync(sourceNode, sidecarPath)
if (!windowsTarget) chmodSync(sidecarPath, 0o755)
console.log(`desktop prepare: runtime and ${sidecarName} are ready`)

function commandOutput(command, args) {
  const result = spawnSync(command, args, { cwd: repositoryRoot, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr.trim()}`)
  return result.stdout.trim()
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function officialNodeBinary(target) {
  const nodeVersion = '24.19.0'
  const platform = new Map([
    ['aarch64-apple-darwin', 'darwin-arm64'],
    ['x86_64-apple-darwin', 'darwin-x64'],
    ['aarch64-unknown-linux-gnu', 'linux-arm64'],
    ['x86_64-unknown-linux-gnu', 'linux-x64'],
    ['aarch64-pc-windows-msvc', 'win-arm64'],
    ['x86_64-pc-windows-msvc', 'win-x64'],
  ]).get(target)
  if (platform === undefined) {
    throw new Error(`desktop prepare: no bundled Node distribution is configured for ${target}; set DSH_NODE_BINARY`)
  }

  const archiveExtension = windowsTarget ? 'zip' : 'tar.gz'
  const directory = `node-v${nodeVersion}-${platform}`
  const archiveName = `${directory}.${archiveExtension}`
  const cacheRoot = join(desktopRoot, '.cache', 'node', target)
  const binary = join(cacheRoot, directory, windowsTarget ? 'node.exe' : 'bin/node')

  mkdirSync(cacheRoot, { recursive: true })
  const baseUrl = `https://nodejs.org/dist/v${nodeVersion}`
  const archive = join(cacheRoot, archiveName)
  if (!existsSync(archive)) {
    run('curl', ['-fL', '--retry', '3', '--output', archive, `${baseUrl}/${archiveName}`], repositoryRoot)
  }
  const sums = commandOutput('curl', ['-fsSL', `${baseUrl}/SHASUMS256.txt`])
  const expected = sums.split('\n')
    .find(line => line.endsWith(`  ${archiveName}`))?.split(/\s+/)[0]
  const actual = createHash('sha256').update(readFileSync(archive)).digest('hex')
  if (expected === undefined || actual !== expected) throw new Error(`desktop prepare: checksum mismatch for ${archiveName}`)

  rmSync(join(cacheRoot, directory), { recursive: true, force: true })
  if (windowsTarget) {
    run('powershell', ['-NoProfile', '-Command', 'Expand-Archive', '-LiteralPath', archive, '-DestinationPath', cacheRoot, '-Force'], repositoryRoot)
  } else {
    run('tar', ['-xzf', archive, '-C', cacheRoot], repositoryRoot)
  }
  if (!existsSync(binary)) throw new Error(`desktop prepare: extracted Node executable missing at ${binary}`)
  return binary
}
