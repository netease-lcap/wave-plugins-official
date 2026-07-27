# 视觉伴侣指南

基于浏览器的视觉头脑风暴伴侣，用于展示 mockup、图表和选项。

## 何时使用

逐题决定，而非逐会话决定。判断标准：**用户看到它比读到它更好理解吗？**

**用浏览器**，当内容本身就是视觉的：

- **UI mockup** —— 线框图、布局、导航结构、组件设计
- **架构图** —— 系统组件、数据流、关系图
- **并排视觉对比** —— 对比两种布局、两种配色、两种设计方向
- **设计打磨** —— 当问题关乎外观、间距、视觉层次时
- **空间关系** —— 状态机、流程图、实体关系以图表呈现

**用终端**，当内容是文本或表格：

- **需求与范围问题** —— 「X 是什么意思？」「哪些功能在范围内？」
- **概念性 A/B/C 选择** —— 在文字描述的方案间选择
- **取舍清单** —— 优缺点、对比表
- **技术决策** —— API 设计、数据建模、架构方案选择
- **澄清问题** —— 答案是文字而非视觉偏好的任何问题

一个*关于* UI 话题的问题不一定是视觉问题。「你要什么样的向导？」是概念问题——用终端。「这两种向导布局哪个感觉对？」是视觉问题——用浏览器。

## 工作原理

服务器监视一个目录的 HTML 文件，把最新的推送给浏览器。你把 HTML 内容写到 `screen_dir`，用户在浏览器里看到它并可以点击选择。选择被记录到 `state_dir/events`，你在下一轮读取。

**内容片段 vs 完整文档：** 如果你的 HTML 文件以 `<!DOCTYPE` 或 `<html` 开头，服务器原样提供（只注入 helper 脚本）。否则，服务器自动把你的内容包进框架模板——加上头部、CSS 主题、连接状态和所有交互基础设施。**默认写内容片段。** 只在需要完全控制页面时才写完整文档。

## 启动会话

```bash
# 在用户同意视觉伴侣之后启动。--open 在第一个界面时自动打开浏览器；
# --project-dir 持久化 mockup 并启用同端口重启。
${WAVE_SKILL_DIR}/scripts/start-server.sh --project-dir /path/to/project --open

# 返回: {"type":"server-started","port":52341,
#        "url":"http://localhost:52341/?key=ab12…",
#        "screen_dir":"/path/to/project/.wave/brainstorm/12345-1706000000/content",
#        "state_dir":"/path/to/project/.wave/brainstorm/12345-1706000000/state"}
```

从响应中保存 `screen_dir` 和 `state_dir`。用 `--open` 时，浏览器在你推送第一个界面时自动打开——你不需要让用户去打开，但仍要把 URL 作为备用分享（无头/远程环境不会自动打开）。

**URL 包含会话密钥（`?key=…`）。** 服务器拒绝任何没有它的请求，所以始终把 `url` 字段的**完整** URL 给用户——绝不剥掉查询字符串，绝不给一个光秃秃的 `http://host:port`。密钥同时管控 HTTP 和 WebSocket 访问，这样 stray 的浏览器标签页或网络上另一台机器无法读取界面或注入事件。首次加载后浏览器通过 cookie 记住密钥，所以刷新和 `/files/*` 资源无需重复携带。

**查找连接信息：** 服务器把启动 JSON 写到 `$STATE_DIR/server-info`。如果你在后台启动了服务器且没捕获 stdout，读那个文件获取 URL 和端口。使用 `--project-dir` 时，检查 `<项目>/.wave/brainstorm/` 找会话目录。

**注意：** 把项目根目录作为 `--project-dir` 传入，这样 mockup 持久化到 `.wave/brainstorm/` 并在服务器重启后保留。不传的话，文件写到 `/tmp` 并在停止时被清理。提醒用户把 `.wave/` 加入 `.gitignore`（如果还没有的话）。

**按平台启动服务器：**

**Wave：**
```bash
# 默认模式即可——脚本自己把服务器放后台。
${WAVE_SKILL_DIR}/scripts/start-server.sh --project-dir /path/to/project --open
```

在 Windows 上，脚本自动检测并切换到前台模式（会阻塞工具调用）。在 Bash 工具调用上用 `run_in_background: true` 让服务器跨对话轮次存活，然后在下一轮读 `$STATE_DIR/server-info` 获取 URL 和端口。

**Codex / CI 环境：**
```bash
# CI 环境会回收后台进程。脚本自动检测 CI 环境变量并切换到前台模式。
# 正常运行即可——无需额外标志。
${WAVE_SKILL_DIR}/scripts/start-server.sh --project-dir /path/to/project --open
```

**Gemini CLI：**
```bash
# 用 --foreground 并在你的 shell 工具调用上设 is_background: true
# 让进程跨轮次存活
${WAVE_SKILL_DIR}/scripts/start-server.sh --project-dir /path/to/project --open --foreground
```

**Copilot CLI：**
```bash
# 用 --foreground 并通过 bash 工具以 mode: "async" 启动服务器
# 让进程跨轮次存活。捕获返回的 shellId 供
# 后续 read_bash / stop_bash 使用。
${WAVE_SKILL_DIR}/scripts/start-server.sh --project-dir /path/to/project --open --foreground
```

**其他环境：** 服务器必须在后台跨对话轮次持续运行。如果你的环境会回收 detached 进程，用 `--foreground` 并用你的平台的后台执行机制启动。

如果 URL 从你的浏览器不可达（在远程/容器化环境中常见），绑定一个非环回地址：

```bash
${WAVE_SKILL_DIR}/scripts/start-server.sh \
  --project-dir /path/to/project \
  --host 0.0.0.0 \
  --url-host localhost
```

用 `--url-host` 控制返回 URL JSON 里打印的主机名。

## 循环

1. **检查服务器存活**，然后往 `screen_dir` 的新文件**写 HTML**：
   - **必需：在引用 URL 或推送界面前确认服务器存活。** 检查 `$STATE_DIR/server-info` 存在且 `$STATE_DIR/server-stopped` 不存在。如果已关闭，用**相同的 `--project-dir`** 重启 `start-server.sh`——它复用同端口，所以用户打开的标签页会自行重连（服务器关闭时显示「已暂停」遮罩），你不需要发新 URL。服务器空闲 4 小时后自动退出（可用 `--idle-timeout-minutes` 配置）。
   - 用语义化文件名：`platform.html`、`visual-style.html`、`layout.html`
   - **绝不复用文件名**——每个界面用新文件
   - 用你的文件创建工具——**绝不用 cat/heredoc**（往终端灌噪声）
   - 服务器自动提供最新文件

2. **告诉用户预期什么，然后结束你的轮次：**
   - 提醒 URL（每步都提，不只是第一次）
   - 简述屏幕上有什么（如「展示了首页的 3 种布局方案」）
   - 请用户在终端回复：「看一下，告诉我你觉得怎么样。想选的话可以点击选项。」

3. **下一轮**——用户在终端回复后：
   - 读 `$STATE_DIR/events`（如果存在）——包含用户的浏览器交互（点击、选择）为 JSON 行
   - 与用户的终端文字合并，得到全貌
   - 终端消息是主要反馈；`state_dir/events` 提供结构化交互数据

4. **迭代或推进**——如果反馈改变当前界面，写新文件（如 `layout-v2.html`）。仅在当前步骤验证后推进到下一问题。

5. **回到终端时卸载**——下一步不需要浏览器时（如澄清问题、取舍讨论），推送一个等待界面清除旧内容：

   ```html
   <!-- 文件名: waiting.html (或 waiting-2.html 等) -->
   <div style="display:flex;align-items:center;justify-content:center;min-height:60vh">
     <p class="subtitle">继续在终端中...</p>
   </div>
   ```

   这防止用户盯着一个已解决的问题而对话已经推进。当下一个视觉问题出现时，照常推送新内容文件。

6. 重复直到完成。

## 写内容片段

只写进入页面的内容。服务器自动把它包进框架模板（头部、主题 CSS、连接状态和所有交互基础设施）。

**最小示例：**

```html
<h2>哪种布局更好？</h2>
<p class="subtitle">考虑可读性和视觉层次</p>

<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>单列</h3>
      <p>干净、聚焦的阅读体验</p>
    </div>
  </div>
  <div class="option" data-choice="b" onclick="toggleSelect(this)">
    <div class="letter">B</div>
    <div class="content">
      <h3>双列</h3>
      <p>侧边栏导航加主内容</p>
    </div>
  </div>
</div>
```

就这样。不需要 `<html>`、CSS 或 `<script>` 标签。服务器提供一切。

## 可用 CSS 类

框架模板为你的内容提供以下 CSS 类：

### 选项（A/B/C 选择）

```html
<div class="options">
  <div class="option" data-choice="a" onclick="toggleSelect(this)">
    <div class="letter">A</div>
    <div class="content">
      <h3>标题</h3>
      <p>描述</p>
    </div>
  </div>
</div>
```

**多选：** 给容器加 `data-multiselect` 让用户选多个选项。每次点击切换该项的选中样式。

```html
<div class="options" data-multiselect>
  <!-- 相同的 option 标记——用户可选/取消多个 -->
</div>
```

### 卡片（视觉设计）

```html
<div class="cards">
  <div class="card" data-choice="design1" onclick="toggleSelect(this)">
    <div class="card-image"><!-- mockup 内容 --></div>
    <div class="card-body">
      <h3>名称</h3>
      <p>描述</p>
    </div>
  </div>
</div>
```

### Mockup 容器

```html
<div class="mockup">
  <div class="mockup-header">预览：仪表盘布局</div>
  <div class="mockup-body"><!-- 你的 mockup HTML --></div>
</div>
```

### 分栏视图（并排）

```html
<div class="split">
  <div class="mockup"><!-- 左 --></div>
  <div class="mockup"><!-- 右 --></div>
</div>
```

### 优缺点

```html
<div class="pros-cons">
  <div class="pros"><h4>优点</h4><ul><li>好处</li></ul></div>
  <div class="cons"><h4>缺点</h4><ul><li>坏处</li></ul></div>
</div>
```

### Mock 元素（线框图构建块）

```html
<div class="mock-nav">Logo | 首页 | 关于 | 联系</div>
<div style="display: flex;">
  <div class="mock-sidebar">导航</div>
  <div class="mock-content">主内容区</div>
</div>
<button class="mock-button">操作按钮</button>
<input class="mock-input" placeholder="输入框">
<div class="placeholder">占位区</div>
```

### 排版与章节

- `h2` —— 页面标题
- `h3` —— 章节标题
- `.subtitle` —— 标题下的次要文字
- `.section` —— 有下边距的内容块
- `.label` —— 小号大写标签文字

## 浏览器事件格式

用户在浏览器点击选项时，交互被记录到 `$STATE_DIR/events`（每行一个 JSON 对象）。文件在你推送新界面时自动清空。

```jsonl
{"type":"click","choice":"a","text":"选项 A - 简单布局","timestamp":1706000101}
{"type":"click","choice":"c","text":"选项 C - 复杂网格","timestamp":1706000108}
{"type":"click","choice":"b","text":"选项 B - 混合","timestamp":1706000115}
```

完整事件流展示用户的探索路径——他们可能在定下来前点多个选项。最后一个 `choice` 事件通常是最终选择，但点击模式可能揭示犹豫或偏好，值得追问。

如果 `$STATE_DIR/events` 不存在，说明用户没和浏览器交互——只用终端文字。

## 设计提示

- **保真度匹配问题**——布局用线框图，打磨问题用高保真
- **每页解释问题**——「哪种布局更专业？」而非只是「选一个」
- **推进前迭代**——如果反馈改变当前界面，写新版本
- **每屏最多 2-4 个选项**
- **该用真实内容时就用**——摄影作品集用真实图片（Unsplash）。占位内容会掩盖设计问题
- **保持 mockup 简单**——聚焦布局和结构，不是像素级设计

## 文件命名

- 用语义化名字：`platform.html`、`visual-style.html`、`layout.html`
- 绝不复用文件名——每个界面必须是新文件
- 迭代时：加版本后缀如 `layout-v2.html`、`layout-v3.html`
- 服务器按修改时间提供最新文件

## 清理

```bash
${WAVE_SKILL_DIR}/scripts/stop-server.sh $SESSION_DIR
```

如果会话用了 `--project-dir`，mockup 文件持久化在 `.wave/brainstorm/` 供日后参考。只有 `/tmp` 会话在停止时被删除。

## 参考

- 框架模板（CSS 参考）：`${WAVE_SKILL_DIR}/scripts/frame-template.html`
- Helper 脚本（客户端）：`${WAVE_SKILL_DIR}/scripts/helper.js`
