/**
 * change-ledger —— 这条会话改过哪些文件，以及工作区里还有什么在变。
 *
 * 数据全来自只读事实，插件不自己扫盘：
 * - `$.session.repo()` 拿到仓库根，两次 `$.process.run` 读到分支与改动；
 * - `$.tool.call` 在 Edit / Write 执行**之前**记下增删行数，顺手在那条工具行下面
 *   贴一行 `$.ui.notice`；
 * - 面板（`ui.render` 的 `Pane` 站点）只读 `$.store` 里的快照，重画不跑 git。
 *
 * 记在调用之前是经过取舍的：我们的 `tool.call` 拿不到执行结果（没有 `next`），
 * 所以「被审批拒掉的编辑」也会先记上。真实宿主里被拒的调用很少，而拿到行数的
 * 价值更大。
 */
import { atom, read, update, Box, Text, Button } from "wave-agent-sdk/mods";

const PLUGIN = "change-ledger";
const PANE = "changes";
/** 面板里每一类最多画几行（面板高度不归插件，行数自己收）。 */
const MAX_ROWS = 6;

/** 本会话编辑过的文件。 */
const edits = atom({ plugin: PLUGIN, key: "edits" }, []);
/** 最近一次读到的 git 工作区（`null` = 不在仓库里）。 */
const tree = atom({ plugin: PLUGIN, key: "tree" }, null);

/** 一次编辑的增删行数：去掉首尾相同的行，只算真正动过的。 */
function lineDelta(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail += 1;
  }
  return { added: b.length - head - tail, removed: a.length - head - tail };
}

/** `git status --porcelain=v1 --branch` 的首行 + 每个文件的两字符状态。 */
function parseStatus(stdout) {
  const [head = "", ...rest] = stdout.split("\n");
  const branch = head
    .replace(/^## /, "")
    .split("...")[0]
    .replace(/^No commits yet on /, "");
  const entries = rest
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      status: line.slice(0, 2).trim() || "?",
      // 重命名写成 `old -> new`，只留新名。
      path: (line.slice(3).split(" -> ").pop() || "").trim(),
    }));
  return {
    branch,
    ahead: Number(/ahead (\d+)/.exec(head)?.[1] ?? 0),
    behind: Number(/behind (\d+)/.exec(head)?.[1] ?? 0),
    entries,
  };
}

/** `git diff --numstat` 的每行：`增 删 路径`，二进制文件的两个数是 `-`。 */
function parseNumstat(stdout) {
  const counts = new Map();
  for (const line of stdout.split("\n")) {
    const [added, removed, ...rest] = line.split("\t");
    if (rest.length === 0 || added === "-") continue;
    const file = rest.join("\t").split(" => ").pop() || "";
    counts.set(file.trim(), { added: Number(added), removed: Number(removed) });
  }
  return counts;
}

/** 重新读一次工作区，写进 store。返回这次读到的快照（`null` = 不在仓库里）。 */
async function refresh($) {
  const repo = await $.session.repo();
  if (!repo) {
    await update($, tree, () => null);
    return null;
  }
  const status = await $.process.run(
    ["git", "status", "--porcelain=v1", "--branch"],
    { cwd: repo.root },
  );
  if (status.exitCode !== 0) return null;
  const numstat = await $.process.run(["git", "diff", "--numstat", "HEAD"], {
    cwd: repo.root,
  });
  const counts = numstat.exitCode === 0 ? parseNumstat(numstat.stdout) : new Map();
  const parsed = parseStatus(status.stdout);
  const snapshot = {
    root: repo.root,
    branch: parsed.branch,
    ahead: parsed.ahead,
    behind: parsed.behind,
    files: parsed.entries.map((entry) => ({
      ...entry,
      ...(counts.get(entry.path) ?? {}),
    })),
  };
  await update($, tree, () => snapshot);
  return snapshot;
}

/** 记一次编辑，返回这个文件的累计。 */
async function record($, filePath, delta) {
  await update($, edits, (list) => {
    const prev = list.find((item) => item.path === filePath);
    const next = prev
      ? {
          ...prev,
          added: prev.added + delta.added,
          removed: prev.removed + delta.removed,
          edits: prev.edits + 1,
        }
      : { path: filePath, added: delta.added, removed: delta.removed, edits: 1 };
    return [next, ...list.filter((item) => item.path !== filePath)];
  });
  return (await read($, edits)).find((item) => item.path === filePath);
}

/** 输入框下面常驻那一行：改了哪些、现在在哪个分支。 */
async function refreshStatus($) {
  const list = await read($, edits);
  const snapshot = await read($, tree);
  if (list.length === 0 && !snapshot) {
    $.ui.status(null);
    return;
  }
  const added = list.reduce((sum, item) => sum + item.added, 0);
  const removed = list.reduce((sum, item) => sum + item.removed, 0);
  const parts = [
    list.length === 0
      ? "还没有改动"
      : `改动 ${list.length} 个文件 +${added} −${removed}`,
  ];
  if (snapshot?.branch) parts.push(snapshot.branch);
  $.ui.status(parts.join(" · "));
}

/** 一段可以贴进对话、也复制得走的纯文本清单。 */
async function listText($) {
  const list = await read($, edits);
  const snapshot = await read($, tree);
  const lines = [];
  if (snapshot) {
    const arrows = [
      snapshot.ahead ? `↑${snapshot.ahead}` : "",
      snapshot.behind ? `↓${snapshot.behind}` : "",
    ].filter(Boolean);
    lines.push(
      `分支 ${snapshot.branch || "(未知)"}${arrows.length ? ` ${arrows.join(" ")}` : ""}，工作区 ${snapshot.files.length} 个改动`,
    );
  }
  if (list.length > 0) {
    lines.push(`本会话编辑 ${list.length} 个文件：`);
    for (const item of list) {
      lines.push(
        `  ${relative(snapshot?.root, item.path)} +${item.added} −${item.removed}（${item.edits} 次）`,
      );
    }
  } else {
    lines.push("本会话还没有编辑过文件");
  }
  for (const file of snapshot?.files ?? []) {
    const counts =
      file.added === undefined ? "" : ` +${file.added} −${file.removed ?? 0}`;
    lines.push(`  ${file.status.padEnd(2)} ${file.path}${counts}`);
  }
  return lines.join("\n");
}

/** 面板里的「复制清单」：拿不到剪贴板也只是一句提示，不是错误。 */
async function copyList($) {
  const result = await $.ui.copy({ text: await listText($) });
  $.ui.toast(
    result.isCopied ? "改动清单已复制" : `这一端复制不了（${result.reason}）`,
  );
}

/** 面板里的「刷新」：重读工作区并让宿主重画一次。 */
async function refreshPane($) {
  await refresh($);
  await refreshStatus($);
  $.ui.invalidate("ui.render");
  $.ui.toast("已刷新");
}

function name(filePath) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

/** 工具给的路径在 Windows 上是 `\`，git status 给的是 `/`：比较与显示先归一。 */
function toSlashes(filePath) {
  return String(filePath).replace(/\\/g, "/");
}

/** 面板里显示相对仓库根的路径；不在仓库里就原样给。 */
function relative(root, filePath) {
  const file = toSlashes(filePath);
  const base = root ? toSlashes(root) : "";
  if (base && file.startsWith(`${base}/`)) {
    return file.slice(base.length + 1);
  }
  return file;
}

export const register = ($, on) => {
  on("session.start", async () => {
    $.command.register({
      name: "changes",
      description: "看这条会话改了哪些文件，以及工作区里还有什么在变",
    });
    await refresh($).catch(() => null);
    await refreshStatus($);
  });

  on("command.run", { command: "changes" }, async () => {
    const snapshot = await refresh($);
    await refreshStatus($);
    const opened = await $.ui.open({ id: PANE, title: "变更" });
    const head = snapshot
      ? `分支 ${snapshot.branch || "(未知)"}，工作区 ${snapshot.files.length} 个改动`
      : "不在 git 仓库里";
    const list = await read($, edits);
    return {
      text: `（/changes：${opened.isPlaced ? "「变更」面板已打开" : "这条会话没有能画面板的地方"}）${head}；本会话编辑 ${list.length} 个文件。`,
    };
  });

  // Edit 的增删行数直接从 old_string / new_string 算，不用读盘。
  on("tool.call", { tool: "Edit" }, async (event) => {
    const delta = lineDelta(
      typeof event.old_string === "string" ? event.old_string : "",
      typeof event.new_string === "string" ? event.new_string : "",
    );
    const total = await record($, String(event.file_path), delta);
    // 没有 tool_use_id 就贴不上（`$.ui.notice` 会拒收空 id），静默跳过。
    if (event.tool_use_id) {
      $.ui.notice(
        String(event.tool_use_id),
        `+${delta.added} −${delta.removed} · 本会话第 ${total.edits} 次改这个文件`,
      );
    }
    await refreshStatus($);
  });

  // Write 会整个覆盖，要先读一眼旧内容才知道删了多少行。
  on("tool.call", { tool: "Write" }, async (event) => {
    const filePath = String(event.file_path);
    const before = await $.fs
      .read(filePath)
      .then((content) => (typeof content === "string" ? content : null))
      .catch(() => null);
    const content = typeof event.content === "string" ? event.content : "";
    const delta =
      before === null
        ? { added: content ? content.split("\n").length : 0, removed: 0 }
        : lineDelta(before, content);
    const total = await record($, filePath, delta);
    if (event.tool_use_id) {
      $.ui.notice(
        String(event.tool_use_id),
        `+${delta.added} −${delta.removed} · 本会话第 ${total.edits} 次写这个文件`,
      );
    }
    await refreshStatus($);
  });

  on("turn.complete", async () => {
    await refresh($).catch(() => null);
    await refreshStatus($);
    $.ui.invalidate("ui.render");
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async () => {
    const list = await read($, edits);
    const snapshot = await read($, tree);
    const agents = await $.agent.list();
    const added = list.reduce((sum, item) => sum + item.added, 0);
    const removed = list.reduce((sum, item) => sum + item.removed, 0);
    const touched = new Set(list.map((item) => relative(snapshot?.root, item.path)));
    const arrows = [
      snapshot?.ahead ? `↑${snapshot.ahead}` : "",
      snapshot?.behind ? `↓${snapshot.behind}` : "",
    ].filter(Boolean);

    return (
      <Box flexDirection="column" gap="sm">
        <Text>
          <Text bold>{snapshot?.branch || "不在 git 仓库里"}</Text>
          {arrows.length ? <Text dimColor> {arrows.join(" ")}</Text> : null}
          <Text dimColor>
            {"  "}
            {list.length} 个文件 +{added} −{removed}
          </Text>
        </Text>

        <Box flexDirection="column">
          <Text bold size="caption">
            本会话改过的文件
          </Text>
          {list.length === 0 ? (
            <Text dimColor>还没有编辑过文件。Edit / Write 之后这里会有记录。</Text>
          ) : (
            list.slice(0, MAX_ROWS).map((item) => (
              <Text key={item.path}>
                <Text>{name(item.path)}</Text>
                <Text color="success"> +{item.added}</Text>
                <Text color="error"> −{item.removed}</Text>
                <Text dimColor>
                  {"  "}
                  {item.edits} 次 · {relative(snapshot?.root, item.path)}
                </Text>
              </Text>
            ))
          )}
          {list.length > MAX_ROWS ? (
            <Text dimColor>还有 {list.length - MAX_ROWS} 个没画出来</Text>
          ) : null}
        </Box>

        <Box flexDirection="column">
          <Text bold size="caption">
            工作区
          </Text>
          {!snapshot ? (
            <Text dimColor>这条会话不在 git 仓库里。</Text>
          ) : snapshot.files.length === 0 ? (
            <Text dimColor>工作区是干净的。</Text>
          ) : (
            snapshot.files.slice(0, MAX_ROWS).map((file) => (
              <Text key={file.path}>
                <Text dimColor>{touched.has(relative(snapshot.root, file.path)) ? "● " : "○ "}</Text>
                <Text color={file.status === "??" || file.status === "A" ? "success" : "warning"}>
                  {file.status.padEnd(2)}
                </Text>
                <Text> {file.path}</Text>
                {file.added === undefined ? null : (
                  <Text dimColor>
                    {"  "}+{file.added} −{file.removed ?? 0}
                  </Text>
                )}
              </Text>
            ))
          )}
          {snapshot && snapshot.files.length > MAX_ROWS ? (
            <Text dimColor>还有 {snapshot.files.length - MAX_ROWS} 个没画出来</Text>
          ) : null}
        </Box>

        <Box flexDirection="column">
          <Text bold size="caption">
            子代理
          </Text>
          {agents.length === 0 ? (
            <Text dimColor>这条会话没有子代理。</Text>
          ) : (
            agents.slice(0, MAX_ROWS).map((agent) => (
              <Text key={agent.id}>
                <Text>{agent.type}</Text>
                <Text dimColor>
                  {"  "}
                  {agent.status} · {agent.id}
                </Text>
              </Text>
            ))
          )}
        </Box>

        <Box gap="sm">
          <Button key="copy" label="复制清单" onPress={() => copyList($)} />
          <Button
            key="refresh"
            label="刷新"
            variant="primary"
            onPress={() => refreshPane($)}
          />
        </Box>
      </Box>
    );
  });
};
