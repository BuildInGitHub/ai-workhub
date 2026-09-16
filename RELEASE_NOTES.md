# Release 发布踩坑笔记

> 本文记录 2026-09 发布 AI WorkHub v26.9.x 系列时踩过的坑，给未来开发者参考。

## 关键事实

1. **GitHub Releases 工作流可以拆为两步**：`build job` 编译三个平台 + `publish job` 下载所有产物 + 调 GitHub API 创建 release + 上传文件。
2. **每次只解决一个问题**：v26.9.2 → v26.9.20 一共发了 18 个版本才把流程彻底走通。

## 踩过的坑（按时间顺序）

### 1. `tsconfig.node.json` 没进 git（v26.9.2）

`electron-builder` 走 vite-plugin-electron 链路时，esbuild 解析 `electron/main.ts` 需要 `tsconfig.node.json`。但 `.gitignore` 写了 `*.json`，这个文件被静默忽略。`vite build` 报错 `ENOENT tsconfig.node.json`。

**修复**：`!tsconfig.node.json` 加进 `.gitignore` 例外，文件 commit。

### 2. GITHUB_TOKEN 默认 read-only（v26.9.2）

GitHub 2023 起把 Actions 默认 `GITHUB_TOKEN` 改成 read-only。`softprops/action-gh-release@v2` 调 `POST /releases` 需要 `contents: write` 才能创建。

**修复**：workflow 顶部加：
```yaml
permissions:
  contents: write
```

### 3. bash-only 语法在 Windows pwsh 下报错（v26.9.3）

```yaml
if [ $rc -ne 0 ]; then   # Windows pwsh 不认 [ ]
```

**修复**：`shell: pwsh`，全部用 PowerShell 语法（`$LASTEXITCODE` / `Tee-Object`）。

### 4. `softprops/action-gh-release@v2` 在并发场景下静默成功（v26.9.3）

3 个 build matrix job 同时调 softprops 创建/更新同一个 release，撞竞态——**所有 job 都报 success，但 release 文件没 attach 上去**。release 页面只剩 source code zip。

**修复**：把 build 和 publish 拆成两个 job（`cc-switch` 的标准模式）：
- `build job`：每个 runner 只 build + 上传 artifacts
- `publish job`：`needs: build` → 下载所有 artifacts → **单次**调 softprops

### 5. `softprops/action-gh-release@v2.6.2` 是 EOL 版本（v26.9.9/10）

v2.6.2 文档标注 "no longer maintained"。即使我们前面修了并发问题，软 props 仍会静默不创建 release（repo 0 releases）。`/releases/tags/v26.9.X` 返回 404。

**修复**：放弃 softprops，直接用 curl 调 GitHub REST API：
1. `POST /releases` 创建 release
2. `POST upload_url?name=<file>` 上传每个文件
每一步都检查 HTTP 状态码 + 打印响应 body，错误立即终止。

### 6. PowerShell `throw-` 不是合法语句（v26.9.11）

```powershell
throw- "..."   # 应该用 throw，不是 throw-
```

PowerShell 把 `throw-` 当 no-op，错误路径永远不会真正 fail。

**修复**：改用 bash + `set -euo pipefail`。

### 7. `target_commitish` 不能是 tag 名（v26.9.12）

```json
{"target_commitish": "v26.9.12"}  # 422 Validation Failed
```

**修复**：删掉这个字段，让 GitHub 默认用 workflow 触发的 commit。

### 8. macOS 图标至少要 512×512（v26.9.8 隐藏）

electron-builder 给 macOS DMG 打包时要求 `public/icon.png` ≥ 512×512。Linux/Windows 容忍小尺寸，所以之前几个 build "success" 把 macOS 失败掩盖了。

**修复**：`scripts/generate-icons.js` 用 sharp 生成 16/32/48/64/128/256/512/1024 八种尺寸的 PNG 到 `build/icons/`，electron-builder 自动生成 `.icns` (mac) + `.ico` (win)。

### 9. Windows 文件名含空格（v26.9.15）

NSIS 默认产物是 `AI WorkHub Setup 1.0.0.exe`（含空格）。README 链接写的是 `AI-WorkHub-1.0.0.exe`。空格 + 名称不匹配 → 404。

**修复**：`package.json` 的 `build.win/mac/linux` 加 `artifactName`：
```json
"win": { "artifactName": "AI-WorkHub-Setup-${version}.${ext}" }
"mac": { "artifactName": "AI-WorkHub-${version}-${arch}.${ext}" }
"linux": { "artifactName": "AI-WorkHub-${version}.${ext}" }
```

### 10. `curl -G` 会强制 GET 请求（v26.9.16）

为了 URL-encode 文件名我用了 `curl -G --data-urlencode 'name=...'`。但 **`-G` 是"force GET"标志**，会覆盖 `-X POST`。请求变成 "GET 上传 90 MB binary body"，GitHub 返回 400。

**修复**：用 `python -c "import urllib.parse; print(urllib.parse.quote(name))"` 手动编码，再 bash 字符串拼接。

### 11. draft release + tag_name 会创建 untagged release（v26.9.17/18）

当 release 用 `draft: true` + `tag_name: "v26.9.18"` 创建时，GitHub 担心 draft 跟 tag 关联的"正式 release"语义冲突，**fallback 到 untagged release**（URL 形如 `releases/download/untagged-XXXX/file`）。asset 文件确实上传了，但 URL 路径不带 tag 名，README 的 `releases/latest/download/<file>` 解析不到。

**修复**：`draft: false`——直接 publish，URL 变 `releases/download/v26.9.19/file`。

### 12. YAML 缩进回归（v26.9.19）

我的 Edit 把 `run: |` block 里某行的 10 空格缩进删了，GitHub Actions 报 "Invalid workflow file: line 164"。

**修复**：恢复缩进。每次 Edit `run: |` block 后用 `python -c "import yaml; yaml.safe_load(open('.github/workflows/release.yml'))"` 校验。

## 调试黄金法则

1. **报错立刻打印响应 body + HTTP code**——别只信 "success"，GitHub API 会静默失败。
2. **每次只解决一个问题**——一次改一个变量，错了知道是谁。
3. **本地 `python -c` 校验 YAML**——CI 反馈太慢。
4. **本地跑测试再 push tag**——tag 触发不可逆，错了又得发新版本。

## 推荐的发布工作流（最终形态）

`.github/workflows/release.yml` 的 `publish` job：

```yaml
- name: Create release and attach installers
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAG: ${{ github.ref_name }}
    REPO: ${{ github.repository }}
  shell: bash
  run: |
    set -euo pipefail

    echo "=== Step 1: Create release for ${TAG} ==="
    create_payload=$(cat <<JSON
    {
      "tag_name": "${TAG}",
      "name": "AI WorkHub ${TAG}",
      "body": "...",
      "draft": false,
      "prerelease": false,
      "generate_release_notes": false
    }
    JSON
    )

    create_response=$(curl -sS -w "\n%{http_code}" -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${GH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${create_payload}" \
      -D /tmp/create-headers.txt \
      "https://api.github.com/repos/${REPO}/releases")
    create_code=$(echo "${create_response}" | tail -n 1)
    if [ "${create_code}" != "201" ]; then
      echo "::error::Failed to create release (HTTP ${create_code})"
      echo "${create_response}" | head -n -1
      cat /tmp/create-headers.txt
      exit 1
    fi

    # 上传每个文件...
    mapfile -t files < <(find dist/ -type f \( -name '*.exe' -o -name '*.dmg' -o -name '*.AppImage' \) | sort)
    upload_url=$(echo "${create_response}" | head -n -1 | python -c "import json,sys; print(json.load(sys.stdin)['upload_url'])" | sed 's/{[^}]*}//g')
    for file in "${files[@]}"; do
      name=$(basename "${file}")
      name_enc=$(python -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "${name}")
      curl -sS -X POST \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer ${GH_TOKEN}" \
        -H "Content-Type: application/octet-stream" \
        --data-binary "@${file}" \
        "${upload_url}?name=${name_enc}"
    done
```

## 相关链接

- [GitHub REST API - Create a release](https://docs.github.com/en/rest/releases/releases#create-a-release)
- [GitHub REST API - Upload a release asset](https://docs.github.com/en/rest/releases/assets)
- [cc-switch release workflow](https://github.com/farion1231/cc-switch/blob/main/.github/workflows/release.yml) — 矩阵 build + 拆 publish job 的参考实现
- [softprops/action-gh-release#152](https://github.com/softprops/action-gh-release/issues/152) — 并发场景下静默成功的已知问题