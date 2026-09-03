// CLI Tracker：检测 PATH 中的可执行文件（which/where），执行安装/卸载命令
// 不持久化扫描结果到 cli_commands 表的"installed"字段，只在用户主动"刷新"时实时探测

import { execFile } from 'node:child_process'

const TIMEOUT_MS = 5 * 60 * 1000 // 5 分钟硬超时
const VERSION_FLAGS = ['--version', '-v', 'version']

export function detectBinary(bin: string): Promise<{ installed: boolean; version?: string; path?: string }> {
  return new Promise(resolve => {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    execFile(cmd, [bin], { timeout: 5000 }, (err, stdout) => {
      if (err) return resolve({ installed: false })
      const out = stdout.toString().trim()
      if (!out) return resolve({ installed: false })
      // 探测版本：依次试 --version/-v/version
      const tryVersion = (flags: string[], i: number) => {
        if (i >= flags.length) return resolve({ installed: true, path: out.split('\n')[0] })
        execFile(bin, [flags[i]], { timeout: 5000 }, (e, so) => {
          if (!e && so.toString().trim()) {
            resolve({ installed: true, version: so.toString().trim().split('\n')[0], path: out.split('\n')[0] })
          } else {
            tryVersion(flags, i + 1)
          }
        })
      }
      tryVersion(VERSION_FLAGS, 0)
    })
  })
}

export function runInstall(cmd: string, onProgress?: (chunk: string) => void): Promise<{ ok: boolean; output: string; error?: string }> {
  return new Promise(resolve => {
    const child = execFile(cmd, { shell: true, timeout: TIMEOUT_MS, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      const out = (stdout || '') + (stderr || '')
      if (err) resolve({ ok: false, output: out, error: err.message })
      else resolve({ ok: true, output: out })
    })
    if (onProgress && child.stdout) {
      child.stdout.on('data', (chunk) => onProgress(chunk.toString()))
    }
    if (onProgress && child.stderr) {
      child.stderr.on('data', (chunk) => onProgress(chunk.toString()))
    }
  })
}
// 让 v2 引擎真正"调用"用户安装的 CLI 工具（async spawn，支持外部 abort）
const activeProcs = new Map<string, any>()
let procSeq = 0

function abortAllCli() {
  for (const p of activeProcs.values()) {
    try { p.kill('SIGTERM') } catch { /* ignore */ }
    setTimeout(() => { try { p.kill('SIGKILL') } catch { /* ignore */ } }, 500)
  }
  activeProcs.clear()
}

export function execCli(bin: string, args: string[], timeoutMs: number = 15000): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number | null; error?: string; pid?: string }> {
  return new Promise(resolve => {
    const { spawn } = require('node:child_process')
    const id = String(++procSeq)
    let proc: any
    try {
      proc = spawn(bin, args, { shell: process.platform === 'win32' })
    } catch (e: any) {
      resolve({ ok: false, stdout: '', stderr: '', exitCode: null, error: e.message })
      return
    }
    activeProcs.set(id, proc)
    let stdout = '', stderr = ''
    proc.stdout?.on('data', (c: Buffer) => { stdout += c.toString(); if (stdout.length > 20000) stdout = stdout.slice(-20000) })
    proc.stderr?.on('data', (c: Buffer) => { stderr += c.toString(); if (stderr.length > 5000) stderr = stderr.slice(-5000) })
    const timer = setTimeout(() => {
      try { proc.kill('SIGTERM') } catch { /* ignore */ }
    }, timeoutMs)
    proc.on('close', (code: number | null) => {
      clearTimeout(timer)
      activeProcs.delete(id)
      resolve({ ok: code === 0, stdout, stderr, exitCode: code, pid: id })
    })
    proc.on('error', (e: Error) => {
      clearTimeout(timer)
      activeProcs.delete(id)
      resolve({ ok: false, stdout, stderr, exitCode: null, error: e.message, pid: id })
    })
  })
}

export { abortAllCli }
