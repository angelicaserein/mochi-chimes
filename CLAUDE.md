# 项目规则（Mochi Chimes · 小红书小工具）

- 产物是离线 H5 zip，规范见 docs/xhs-minitool/（先读 SKILL.md 和 references/）
- 脚本必须是经典脚本：不用 type="module"、import/export；JS 目标 ES2017（Chrome 61）
- CSS 以 Chrome 61 为基线：不用 inset、min/max/clamp 作为唯一写法、aspect-ratio、flex gap
- 禁用：fetch/XHR、Worker、eval、iframe、外链资源、剪贴板、定位等（见 device-capabilities.md）
- 音频用 WebAudio 合成，不新增 mp3/ogg/wav 文件
- 提交信息：Conventional Commits，前缀英文、描述中文，如 "feat: xxx"
- 一个分支只改自己负责的文件；改完跑 python tools/xhs-minitool-audit/audit_artifact.py dist 并通过
- 不要运行 git push、不要改其他分支
