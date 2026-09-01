// Skill Loader：扫描本地 SKILL.md 并解析 frontmatter，构造 Pi SDK 认识的 Skill 对象
// 路径约定：%APPDATA%/ai-workhub/skills/<skill-name>/SKILL.md
// SKILL.md 格式：
//   ---
//   name: <必须与目录名相同>
//   description: <何时使用>
//   ---
//   <正文，注入到 system prompt>
//
// 不调用 pi-agent-core 的 loadSkills（它要求完整的 ExecutionEnv：FileSystem+Shell+Result 包装），
// 自己在主进程扫文件就够了，喂给 formatSkillsForSystemPrompt。

import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export interface Skill {
  name: string
  description: string
  content: string
  filePath: string
  disableModelInvocation?: boolean
}

function getSkillsDir(): string {
  return path.join(app.getPath('userData'), 'skills')
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '')
    if (key) data[key] = value
  }
  return { data, body: m[2] }
}

export async function listSkillDirs(): Promise<string[]> {
  const dir = getSkillsDir()
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch {
    return []
  }
}

export async function loadAllSkills(): Promise<Skill[]> {
  const dirs = await listSkillDirs()
  const skills: Skill[] = []
  for (const name of dirs) {
    const filePath = path.join(getSkillsDir(), name, 'SKILL.md')
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const { data, body } = parseFrontmatter(raw)
      if (!data.name || !data.description) {
        console.warn(`[Skill] ${filePath} 缺少 name/description，跳过`)
        continue
      }
      if (data.name !== name) {
        console.warn(`[Skill] ${filePath} 名称 ${data.name} 与目录 ${name} 不一致，跳过`)
        continue
      }
      skills.push({
        name: data.name,
        description: data.description,
        content: body.trim(),
        filePath,
      })
    } catch (e: any) {
      console.warn(`[Skill] 读取失败: ${filePath}`, e.message)
    }
  }
  return skills
}

export async function installSkillFromMarket(item: { name: string; manifest: { name: string; description: string }; content?: string }): Promise<{ ok: boolean; error?: string }> {
  const target = path.join(getSkillsDir(), item.name, 'SKILL.md')
  if (!item.content) {
    // 市场项没带正文，只写 frontmatter；用户后期手动编辑 SKILL.md
    const body = `# ${item.name}\n\n请补充本 skill 的具体使用说明。\n`
    const frontmatter = `---\nname: ${item.manifest.name}\ndescription: ${item.manifest.description}\n---\n\n`
    try {
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.writeFile(target, frontmatter + body, 'utf-8')
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }
  try {
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, item.content, 'utf-8')
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function removeSkill(name: string): Promise<void> {
  const dir = path.join(getSkillsDir(), name)
  await fs.rm(dir, { recursive: true, force: true })
}

export function getSkillsRootPath(): string {
  return getSkillsDir()
}