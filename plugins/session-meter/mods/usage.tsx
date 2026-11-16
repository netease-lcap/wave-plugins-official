/**
 * session-meter —— 上下文用了几成、这一场累计花了多少 token。
 *
 * 三个落点都用上了同一条纪律「现取现算、不订阅」：
 * - `/ctx` 命令：打开面板，并把当前数字念一遍（发给模型，也留在对话里）；
 * - 输入框下面那一行（`$.ui.status`）：`session.measure` 一响就更新；
 * - 面板（`ui.render` 的 `Pane` 站点）：每帧现问一次 `$.session.usage()`。
 *
 * 面板里没有「成本」：引擎没有成本账本，编一个金额不如不写。
 */
import { Box, Text, Button, Progress } from "wave-agent-sdk/mods";

const PANE = "usage";

/** 12k / 1.2M 这种给人看的写法。 */
function count(n) {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** 毫秒 → `1h02m` / `3m20s`。 */
function elapsed(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, "0")}m`;
  }
  if (minutes > 0) return `${minutes}m${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

/** 百分比取整，夹在 0–100（引擎给的已经夹过，这里只是不信任浮点尾巴）。 */
function percentOf(usage) {
  const raw = usage?.context?.percent;
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/** 输入框下面那一行 / 没有会话数据时清掉。 */
function statusFor(usage) {
  if (!usage) return null;
  const percent = percentOf(usage);
  return `上下文 ${percent}%（${count(usage.context.tokens)} / 窗口 ${count(usage.context.window)}）`;
}

export const register = ($, on) => {
  on("session.start", () => {
    $.command.register({
      name: "ctx",
      description: "看上下文用量与本场累计的 token",
    });
    $.ui.status(statusFor($.session.usage()));
  });

  // 刚收到一次带 usage 的响应：更新那一行，并请宿主重画面板。
  on("session.measure", () => {
    $.ui.status(statusFor($.session.usage()));
    $.ui.invalidate("ui.render");
  });

  on("command.run", { command: "ctx" }, async () => {
    const usage = $.session.usage();
    const turns = await $.session.turns();
    const opened = await $.ui.open({ id: PANE, title: "用量" });
    const percent = percentOf(usage);
    const head = opened.isPlaced ? "「用量」面板已打开" : "这条会话没有能画面板的地方";
    return {
      text: `（/ctx：${head}）上下文 ${percent}%（${count(usage.context.tokens)}/${count(usage.context.window)}），本场累计输出 ${count(usage.tokens.completion)} token，已经过 ${turns} 轮。`,
    };
  });

  on("turn.complete", () => {
    $.ui.status(statusFor($.session.usage()));
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async () => {
    const usage = $.session.usage();
    const turns = await $.session.turns();
    const model = await $.session.model();
    const version = await $.session.version();
    const toolCount = $.tool.list().length;
    const now = $.clock.now();
    const percent = percentOf(usage);
    const context = usage.context;

    return (
      <Box flexDirection="column" gap="sm">
        <Progress
          label="上下文"
          value={percent}
          max={100}
          valueText={`${percent}% · ${count(context.tokens)} / 窗口 ${count(context.window)}`}
          color={percent >= 90 ? "#c62828" : percent >= 70 ? "#b26a00" : undefined}
        />

        <Box flexDirection="column">
          <Text bold size="caption">
            本场累计
          </Text>
          <Text>
            <Text dimColor>输入 </Text>
            <Text>{count(usage.tokens.prompt)}</Text>
            <Text dimColor> 输出 </Text>
            <Text>{count(usage.tokens.completion)}</Text>
          </Text>
          <Text>
            <Text dimColor>缓存读 </Text>
            <Text>{count(usage.tokens.cacheRead)}</Text>
            <Text dimColor> 缓存写 </Text>
            <Text>{count(usage.tokens.cacheCreation)}</Text>
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text bold size="caption">
            这条会话
          </Text>
          <Text>
            <Text dimColor>轮次 </Text>
            <Text>{turns}</Text>
            <Text dimColor> · 已过 </Text>
            <Text>{elapsed(now - usage.startedAt)}</Text>
          </Text>
          <Text>
            <Text dimColor>模型 </Text>
            <Text>{model || "(未配置)"}</Text>
          </Text>
          <Text dimColor>
            wave {version.version || "(未知版本)"} · {toolCount} 个工具可用
          </Text>
        </Box>

        <Box gap="sm">
          <Button
            key="copy"
            label="复制数字"
            onPress={async () => {
              const result = await $.ui.copy({
                text: `上下文 ${percent}%（${context.tokens}/${context.window}）；累计 输入 ${usage.tokens.prompt} 输出 ${usage.tokens.completion}；${turns} 轮；模型 ${model || "(未配置)"}`,
              });
              $.ui.toast(
                result.isCopied ? "已复制" : `这一端复制不了（${result.reason}）`,
              );
            }}
          />
          <Button
            key="refresh"
            label="刷新"
            variant="primary"
            onPress={() => {
              $.ui.invalidate("ui.render");
              $.ui.toast("已刷新");
            }}
          />
        </Box>
      </Box>
    );
  });
};
