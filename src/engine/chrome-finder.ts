import * as fs from 'fs'
import * as path from 'path'

const COMMON_PATHS: string[] = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files\\Chromium\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\Chromium\\Application\\chrome.exe`
]

const REG_QUERY_COMMANDS = [
  'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve 2>nul',
  'reg query "HKEY_CURRENT_USER\\SOFTWARE\\Google\\Chrome\\HTMLEditor" /ve 2>nul'
]

export function findChrome(): string | null {
  for (const p of COMMON_PATHS) {
    try {
      if (fs.existsSync(p)) return p
    } catch {
      continue
    }
  }
  return null
}
