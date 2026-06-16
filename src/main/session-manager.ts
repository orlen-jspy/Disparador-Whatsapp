import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

export function getProfileDir(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), '.config')
  const profileDir = path.join(appData, 'novo-disparador', 'profile')
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true })
  }
  return profileDir
}
