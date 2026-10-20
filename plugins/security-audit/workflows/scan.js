export const meta = {
  name: "scan",
  description:
    "Security Audit 扫描编排：分区 → 威胁建模 → 并行漏洞狩猎 → 独立复核（high 档为三视角对抗 Panel），返回已合并去重、已复核的 findings 与 rejected，由调用方写 report.md / findings.json / results.sarif",
  whenToUse:
    "由 scan-codebase / scan-changes 两个 job 在用户确认扫描之后调用。args 必须携带 mode、scanRoot、runDir、scope、areas；没有 args（用户直接敲了斜杠命令）时不要调用 Workflow，改为提示用户打开 /security-audit 菜单。",
  phases: [
    {
      title: "Threat model",
      detail: "每组件组一份威胁模型简报，只有本组的 hunter 用得到",
    },
    {
      title: "Hunt",
      detail: "一个区域一个 hunter，并行；找不到东西的 hunter 必须明说",
    },
    {
      title: "Panel",
      detail: "每条发现独立复核：medium 及以下单复核者，high 为三视角投票",
    },
  ],
};

/* ---------------------------------------------------------------------------
 * 常量（全部前置：脚本顶部就在跑流程，函数体读到的名字必须已经初始化）
 * ------------------------------------------------------------------------ */

/**
 * `GIT` 在 job 文件里是「带固定环境的 git」的简写，这里展开成同样的东西：用户
 * 的全局 git 配置不参与，也不会弹出凭证或分页提示卡住无人值守的扫描。
 */
const GIT = "GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 git";

/**
 * effort 只决定三件事的规模：区域上限、威胁模型数、复核形态。它不改变流程
 * ——流程固定是「建模 → 狩猎 → 复核」，任何档位都不允许跳过复核。
 */
const TIERS = {
  low: { areas: 3, modelers: 1, panel: false },
  medium: { areas: 6, modelers: 2, panel: false },
  high: { areas: 12, modelers: 3, panel: true },
};

const DEFAULT_EFFORT = "medium";

/**
 * Panel 的三个视角。每条发现由三个独立复核者各验一件事，而不是三个人重复
 * 同一遍判断——重复不降低假阳，分工才降低。
 */
const LENSES = [
  {
    id: "reads-as-claimed",
    ask: "只看一件事：代码是不是真的像这条发现描述的那样。打开它的 location，读足够上下文（不是只看引用那一行），代码与描述不符就 rejected。",
  },
  {
    id: "attacker-controlled",
    ask: "只看一件事：喂给 sink 的值是不是真由攻击者控制。往上找调用者和它参数的来源，追到入口点；常量、内部固定值、上游已验证的值都是 rejected，并给出验证它的是哪个 file:line。",
  },
  {
    id: "mitigation-and-reachability",
    ask: "只看一件事：输入到 sink 之间有没有缓解步骤，以及这条路径到底可不可达。参数化查询、白名单、路径规范化、权限检查、框架转义都算缓解；死代码、只在测试里用的辅助函数、由开关关掉的路径、已登录管理员专属路由都要说清差别。",
  },
];

/**
 * 结构化输出 schema。根必须是 object（工具入参接受不了数组根），所以 hunter
 * 的数组、复核者的数组各包一层。字段与 agents/*.md 里已经约定的形状一一对
 * 应——那边是契约，这里只是把它变成机器可校验的形状，别在两处写出不同的字段
 * 名。
 */
const HUNT_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          cweId: { type: "string" },
          category: { type: "string" },
          impact: { type: "string" },
          exploitScenario: { type: "string" },
          location: {
            type: "object",
            properties: {
              file: { type: "string" },
              startLine: { type: "number" },
              endLine: { type: "number" },
            },
            required: ["file", "startLine", "endLine"],
          },
          symbol: { type: "string" },
          snippet: { type: "string" },
          evidence: { type: "string" },
          remediation: { type: "string" },
        },
        required: [
          "title",
          "severity",
          "confidence",
          "cweId",
          "category",
          "impact",
          "exploitScenario",
          "location",
          "snippet",
          "evidence",
          "remediation",
        ],
      },
    },
  },
  required: ["findings"],
};

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          findingIndex: { type: "number" },
          verdict: {
            type: "string",
            enum: ["confirmed", "rejected", "uncertain"],
          },
          reason: { type: "string" },
          reachability: { type: "string" },
          severityAdjustment: { type: "string", enum: ["keep", "lower"] },
        },
        required: ["findingIndex", "verdict", "reason", "severityAdjustment"],
      },
    },
  },
  required: ["verdicts"],
};

const CHANGE_PATH_SCHEMA = {
  type: "object",
  properties: {
    paths: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["opened", "still_reachable", "set_aside"],
          },
          title: { type: "string" },
          attackPath: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["kind", "title", "attackPath", "evidence"],
      },
    },
    notes: { type: "string" },
  },
  required: ["paths"],
};

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };
const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 };

/* ---------------------------------------------------------------------------
 * 启动：校验 args
 *
 * 脚本不猜、不降级：拿不到它需要的设置就说清楚缺什么、让调用方补。一个自己
 * 编一个 scanRoot 的脚本，比一个拒绝启动的脚本危险得多。
 * ------------------------------------------------------------------------ */

const settingsResult = checkArgs(parseArgs(args));
if (!settingsResult.ok) {
  log(`scan.js 没有启动：${settingsResult.reason}`);
  return {
    started: false,
    reason: settingsResult.reason,
    next: settingsResult.next,
  };
}

const S = settingsResult.settings;

const partition = capAreas(S.areas, S.tier.areas);
if (partition.areas.length === 0) {
  log("scan.js 没有启动：areas 为空");
  return {
    started: false,
    reason: "no-areas",
    next: "areas 是空的，没有可扫的东西。用 `git ls-files` 的结果按顶层目录分组后重新调用。",
  };
}

const groups = chunk(
  partition.areas,
  Math.min(S.tier.modelers, partition.areas.length),
);

/* ---------------------------------------------------------------------------
 * Phase: Threat model
 * ------------------------------------------------------------------------ */

phase("Threat model");
log(
  `威胁建模：${partition.areas.length} 个区域分成 ${groups.length} 组（effort=${S.effort}）`,
);

const briefs = await parallel(
  groups.map((group, index) => () =>
    agent(threatPrompt(S, group), {
      agentType: "security-audit:threat-modeler",
      label: `threat-model ${index + 1}`,
      phase: "Threat model",
    }),
  ),
);

/* ---------------------------------------------------------------------------
 * Phase: Hunt
 * ------------------------------------------------------------------------ */

phase("Hunt");

const huntJobs = [];
groups.forEach((group, groupIndex) => {
  group.forEach((area) => {
    huntJobs.push({ area, brief: briefs[groupIndex] });
  });
});

const briefless = huntJobs.filter((job) => !job.brief).length;
log(
  `狩猎：${huntJobs.length} 个 hunter${briefless > 0 ? `，其中 ${briefless} 个拿不到威胁模型（仍会派，简报说明缺失）` : ""}`,
);

const huntResults = await parallel(
  huntJobs.map((job) => () =>
    agent(huntPrompt(S, job.area, job.brief), {
      agentType: "security-audit:vulnerability-hunter",
      schema: S.mode === "changes" ? CHANGE_PATH_SCHEMA : HUNT_SCHEMA,
      label: `hunt ${job.area.name}`,
      phase: "Hunt",
    }),
  ),
);

const candidates = collectCandidates(S.mode, huntJobs, huntResults);
const failedAreas = huntJobs
  .filter((job, index) => huntResults[index] === null)
  .map((job) => job.area.name);

log(
  `狩猎完成：${candidates.length} 条候选${failedAreas.length > 0 ? `（${failedAreas.length} 个区域没有回话）` : ""}`,
);

/* ---------------------------------------------------------------------------
 * Phase: Panel
 *
 * 一条没过复核的发现不许进 findings[]，一条没过复核的「否决」也不许被脚本自
 * 己翻案——这里只做仲裁，不做判断。
 * ------------------------------------------------------------------------ */

const merged = mergeCandidates(candidates);
let findings = [];
let rejected = [];

if (merged.length === 0) {
  log("没有候选发现，跳过 Panel");
} else {
  phase("Panel");
  const verdicts = S.tier.panel
    ? await panelReview(S, merged)
    : await singleReview(S, merged);

  const settled = settleFindings(merged, verdicts);
  findings = settled.findings;
  rejected = settled.rejected;
  log(
    `复核完成：${findings.length} 条确认，${rejected.length} 条否决或无法判定`,
  );
}

return {
  started: true,
  settings: {
    mode: S.mode,
    effort: S.effort,
    scope: S.scope,
    scopeDetail: S.scopeDetail,
    scanRoot: S.scanRoot,
    runDir: S.runDir,
    excluded: S.excluded,
    hunters: partition.areas.length,
    modelers: groups.length,
    mergedAreas: partition.mergedAreas,
    panel: S.tier.panel ? LENSES.map((lens) => lens.id) : "single",
    candidates: merged.length,
  },
  findings: findings.map((finding, index) => ({
    ...finding,
    id: `F${index + 1}`,
  })),
  rejected: rejected.map((item, index) => ({ ...item, id: `R${index + 1}` })),
  coverage: {
    areasAsked: partition.areas.map((area) => area.name),
    areasFailed: failedAreas,
    failedAgentDetails: getFailures(),
  },
};

/* ===========================================================================
 * 以下都是函数声明与纯计算：不调用 agent()，也不碰文件系统
 * ======================================================================== */

function parseArgs(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object") return value;
  return null;
}

function checkArgs(raw) {
  if (!raw) {
    return {
      ok: false,
      reason: "no-args",
      next: "这个扫描没有拿到它需要的设置（mode、scanRoot、runDir、scope、areas）。没有任何东西失败，也没有产物可看。告诉用户运行 /security-audit 打开菜单，由菜单收集扫描设置后再调用。不要自己编一套设置重试。",
    };
  }

  let mode = null;
  if (raw.mode === "codebase") mode = "codebase";
  if (raw.mode === "changes") mode = "changes";
  if (!mode) {
    return {
      ok: false,
      reason: "bad-mode",
      next: 'mode 必须是 "codebase" 或 "changes"。',
    };
  }

  const scanRoot = typeof raw.scanRoot === "string" ? raw.scanRoot : "";
  if (!scanRoot) {
    return {
      ok: false,
      reason: "no-scan-root",
      next: "缺 scanRoot（要扫的绝对路径）。它就是 Step 1 `git rev-parse --show-toplevel` 的输出，或用户确认的那块子目录。",
    };
  }

  const runDir = typeof raw.runDir === "string" ? raw.runDir : "";
  if (!runDir) {
    return {
      ok: false,
      reason: "no-run-dir",
      next:
        "缺 runDir（本次扫描的证据目录绝对路径）。先按 report-spec 建好 WAVE-SECURITY-<ts>/ 与它的 .gitignore，再把路径传进来。",
    };
  }

  const areas = [];
  if (Array.isArray(raw.areas)) {
    raw.areas.forEach((area) => {
      if (!area || typeof area !== "object") return;
      const name = typeof area.name === "string" ? area.name : "";
      const paths = Array.isArray(area.paths)
        ? area.paths.filter((item) => typeof item === "string" && item)
        : [];
      if (!name || paths.length === 0) return;
      areas.push({
        name,
        paths,
        fileCount: typeof area.fileCount === "number" ? area.fileCount : 0,
      });
    });
  }
  if (areas.length === 0) {
    return {
      ok: false,
      reason: "no-areas",
      next: "缺 areas。用 `git ls-files`（或改动文件清单）按顶层目录分组，每组给 name、paths（组的路径前缀，不是几千个文件名）和 fileCount。",
    };
  }

  const effort = Object.prototype.hasOwnProperty.call(TIERS, raw.effort)
    ? raw.effort
    : DEFAULT_EFFORT;

  return {
    ok: true,
    settings: {
      mode,
      effort,
      tier: TIERS[effort],
      scanRoot,
      runDir,
      scope: typeof raw.scope === "string" ? raw.scope : "repo",
      scopeDetail: typeof raw.scopeDetail === "string" ? raw.scopeDetail : "",
      range:
        raw.range && typeof raw.range === "object"
          ? {
              base: typeof raw.range.base === "string" ? raw.range.base : "",
              head: typeof raw.range.head === "string" ? raw.range.head : "",
            }
          : null,
      excluded: Array.isArray(raw.excluded)
        ? raw.excluded.filter((item) => typeof item === "string")
        : [],
      areas,
    },
  };
}

function chunk(items, count) {
  const size = Math.max(1, Math.ceil(items.length / count));
  const out = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

/**
 * 区域数超过一档的上限时，保留最大的若干个，其余按目录并进最小的那个保留区。
 * 并法写进 mergedAreas，报告里能说明覆盖是怎么被压缩的。
 */
function capAreas(areas, cap) {
  const sorted = [...areas].sort((a, b) => areaWeight(b) - areaWeight(a));
  if (sorted.length <= cap) {
    return { areas: sorted, mergedAreas: [] };
  }
  const kept = sorted.slice(0, cap);
  const overflow = sorted.slice(cap);
  const smallest = kept.reduce((min, area) =>
    areaWeight(area) <= areaWeight(min) ? area : min,
  );
  const mergedAreas = [];
  overflow.forEach((area) => {
    area.paths.forEach((item) => {
      if (!smallest.paths.includes(item)) smallest.paths.push(item);
    });
    smallest.fileCount += area.fileCount;
    mergedAreas.push(`${area.name} → ${smallest.name}`);
  });
  return { areas: kept, mergedAreas };
}

function areaWeight(area) {
  return area.fileCount > 0 ? area.fileCount : area.paths.length;
}

function threatPrompt(settings, group) {
  const areaLines = group
    .map(
      (area) =>
        `- ${area.name} — ${area.paths.join(", ")}${area.fileCount > 0 ? `（约 ${area.fileCount} 个文件）` : ""}`,
    )
    .join("\n");

  const subject =
    settings.mode === "changes"
      ? `这次扫描的对象是一段**改动**：${settings.scopeDetail || `${settings.range?.base}...${settings.range?.head}`}。先用 \`${GIT} diff\` 看这段改动做了什么，再判断它触碰或移动了哪些信任边界。`
      : `这次扫描的对象是**已存在的代码**，范围是 ${settings.scopeDetail || "整个仓库"}。`;

  return [
    `扫描根目录（绝对路径）：${settings.scanRoot}`,
    subject,
    "",
    "你负责下面这些区域（只看这些，别人看别处）：",
    areaLines,
    "",
    "按你的职责产出威胁模型简报，形状与你 agent 说明里的完全一致（## Architecture / ## Trust boundaries / ## Sensitive data / ## Threat model (ranked) / ## Suggested hunt areas）。",
    "后面每一个 hunter 都会拿到你这份简报的原文，所以写清楚他们该先读哪里。",
  ].join("\n");
}

function huntPrompt(settings, area, brief) {
  const lines = [
    `扫描根目录（绝对路径）：${settings.scanRoot}`,
    `你的区域：${area.name}`,
    `区域路径：${area.paths.join(", ")}${area.fileCount > 0 ? `（约 ${area.fileCount} 个文件）` : ""}`,
    `扫描范围：${settings.scopeDetail || settings.scope}`,
  ];

  if (settings.mode === "changes") {
    const base = settings.range?.base || "<base>";
    const head = settings.range?.head || "<head>";
    lines.push(
      "",
      `这次是审**一段改动**，不是审整个仓库。改动用 \`${GIT} diff ${base}...${head} -- ${area.paths.join(" ")}\` 取（先用它拿到这个区域的 diff hunk），必要时再读改动的周边代码。`,
      "只报这段改动**引入的、放开的、或让它变得可达的**问题。改动没有引入的问题属于全库扫描，写进 notes 说明，不要报成 finding。",
    );
  }

  if (typeof brief === "string" && brief.trim()) {
    lines.push(
      "",
      "威胁模型简报（来自 threat-modeler，原文照用）：",
      "",
      brief.trim(),
    );
  } else {
    lines.push(
      "",
      "没有拿到威胁模型简报（建模那一步失败了）。自己先快速判断这个区域的入口点与信任边界再开始找，并在 notes 里说明简报缺失。",
    );
  }

  if (settings.mode === "changes") {
    lines.push(
      "",
      '返回 {"paths": [...]}，元素形状按你 agent 说明里「审一段改动」那一节（kind / title / attackPath / evidence），不要返回数组本身。',
    );
  } else {
    lines.push(
      "",
      '返回 {"findings": [...]}，元素形状按你 agent 说明里那一节（title / severity / confidence / cweId / category / impact / exploitScenario / location / symbol / snippet / evidence / remediation），不要返回数组本身。区域干净时返回 {"findings": []}——找不到东西是有效答案，不要为了显得尽责而编。',
    );
  }
  return lines.join("\n");
}

function collectCandidates(mode, jobs, results) {
  const out = [];
  jobs.forEach((job, index) => {
    const result = results[index];
    if (!result || typeof result !== "object") return;

    if (mode === "changes") {
      const paths = Array.isArray(result.paths) ? result.paths : [];
      paths.forEach((path) => {
        if (!path || path.kind === "set_aside") return;
        out.push(changePathToCandidate(path, job.area.name));
      });
      return;
    }

    const findings = Array.isArray(result.findings) ? result.findings : [];
    findings.forEach((finding) => {
      if (!finding || !finding.location || !finding.location.file) return;
      out.push({
        title: stringOr(finding.title, "untitled finding"),
        severity: normalizeSeverity(finding.severity),
        confidence: normalizeConfidence(finding.confidence),
        cweId: stringOr(finding.cweId, "CWE-000"),
        category: stringOr(finding.category, "other"),
        impact: stringOr(finding.impact, ""),
        exploitScenario: stringOr(finding.exploitScenario, ""),
        location: {
          file: finding.location.file,
          startLine: numberOr(finding.location.startLine, 0),
          endLine: numberOr(finding.location.endLine, 0),
        },
        symbol: stringOr(finding.symbol, ""),
        snippet: stringOr(finding.snippet, ""),
        evidence: stringOr(finding.evidence, ""),
        remediation: stringOr(finding.remediation, ""),
        areas: [job.area.name],
      });
    });
  });
  return out;
}

/**
 * 改动的产出形状是「攻击路径」而不是「发现」（kind / title / attackPath），但
 * 进复核和进报告的必须是同一种东西——这里把它对齐成候选发现，路径本身留在
 * exploitScenario 里，一个字都不丢。severity 只是复核者的起点（复核只能往下
 * 调）：改动**新开的**路径按 high 起，**让旧问题重新可达的**按 medium 起。
 */
function changePathToCandidate(path, areaName) {
  return {
    title: stringOr(path.title, "untitled path"),
    severity: path.kind === "opened" ? "high" : "medium",
    confidence: "medium",
    cweId: "CWE-000",
    category: "other",
    impact: stringOr(path.title, ""),
    exploitScenario: stringOr(path.attackPath, ""),
    location: {
      file: guessFileFromPath(path.attackPath),
      startLine: 0,
      endLine: 0,
    },
    symbol: "",
    snippet: "",
    evidence: stringOr(path.evidence, ""),
    remediation: "",
    areas: [areaName],
  };
}

/**
 * attackPath 是「谁发什么、到得了哪些代码，每一跳一个 file:line」。取第一个像
 * 文件路径的片段作为这条路径的锚点，纯粹是为了让报告能按文件索引；路径正文仍
 * 然完整留在 exploitScenario 里。
 */
function guessFileFromPath(text) {
  const match = String(text || "").match(/[\w./-]+\.\w+/);
  return match ? match[0] : "";
}

function stringOr(value, fallback) {
  return typeof value === "string" && value ? value : fallback;
}

function numberOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSeverity(value) {
  return value === "critical" || value === "high" || value === "medium"
    ? value
    : "low";
}

function normalizeConfidence(value) {
  return value === "high" || value === "medium" ? value : "low";
}

/**
 * 合并重复：同文件、同 CWE、起始行相差不超过 5 的两个候选是同一个弱点，保留
 * 一条，严重度与置信度取两者中较高的，另一个区域记进 areas。
 */
function mergeCandidates(candidates) {
  const kept = [];
  candidates.forEach((candidate) => {
    const duplicate = kept.find(
      (existing) =>
        existing.location.file === candidate.location.file &&
        existing.cweId.toLowerCase() === candidate.cweId.toLowerCase() &&
        Math.abs(existing.location.startLine - candidate.location.startLine) <=
          5,
    );
    if (!duplicate) {
      kept.push({ ...candidate, areas: [...candidate.areas] });
      return;
    }
    if (SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[duplicate.severity]) {
      duplicate.severity = candidate.severity;
    }
    if (
      CONFIDENCE_RANK[candidate.confidence] >
      CONFIDENCE_RANK[duplicate.confidence]
    ) {
      duplicate.confidence = candidate.confidence;
    }
    candidate.areas.forEach((area) => {
      if (!duplicate.areas.includes(area)) duplicate.areas.push(area);
    });
  });
  return kept;
}

/**
 * 单复核者：按文件成批，一个复核者判同一文件里的若干条（report-spec 允许），
 * 但每条各自给 verdict。
 */
async function singleReview(settings, candidates) {
  const byFile = new Map();
  candidates.forEach((candidate, index) => {
    const key = candidate.location.file;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(index);
  });

  const batches = [...byFile.values()];
  log(`复核：${candidates.length} 条候选分成 ${batches.length} 批（单复核者）`);

  const results = await parallel(
    batches.map((batch, batchIndex) => () =>
      agent(reviewPrompt(settings, candidates, batch, null), {
        agentType: "security-audit:finding-verifier",
        schema: VERDICT_SCHEMA,
        label: `verify batch ${batchIndex + 1}`,
        phase: "Panel",
      }),
    ),
  );

  return normalizeVerdicts(results, batches);
}

/**
 * 三视角 Panel：每条发现 × 三个视角，各一个独立复核者。多数票才算数——一票
 * 确认一票否决一票不确定，结论就是不确定，而不是让脚本挑一个。
 */
async function panelReview(settings, candidates) {
  const jobs = [];
  candidates.forEach((candidate, index) => {
    LENSES.forEach((lens) => {
      jobs.push({ candidateIndex: index, lens });
    });
  });
  log(`复核：${candidates.length} 条候选 × ${LENSES.length} 个视角`);

  const results = await parallel(
    jobs.map((job) => () =>
      agent(
        reviewPrompt(settings, candidates, [job.candidateIndex], job.lens),
        {
          agentType: "security-audit:finding-verifier",
          schema: VERDICT_SCHEMA,
          label: `panel ${job.candidateIndex + 1} ${job.lens.id}`,
          phase: "Panel",
        },
      ),
    ),
  );

  const perCandidate = new Map();
  results.forEach((result, index) => {
    const job = jobs[index];
    const verdicts = Array.isArray(result?.verdicts) ? result.verdicts : [];
    if (verdicts.length === 0) return;
    if (!perCandidate.has(job.candidateIndex)) {
      perCandidate.set(job.candidateIndex, []);
    }
    perCandidate.get(job.candidateIndex).push({
      verdict: normalizeVerdict(verdicts[0].verdict),
      reason: stringOr(verdicts[0].reason, "no reason given"),
      severityAdjustment:
        verdicts[0].severityAdjustment === "lower" ? "lower" : "keep",
      lens: job.lens.id,
    });
  });
  return perCandidate;
}

function normalizeVerdicts(results, batches) {
  const perCandidate = new Map();
  results.forEach((result, batchIndex) => {
    const batch = batches[batchIndex];
    if (!batch) return;
    const verdicts = Array.isArray(result?.verdicts) ? result.verdicts : [];

    batch.forEach((candidateIndex, position) => {
      const match =
        verdicts.find((verdict) => verdict?.findingIndex === candidateIndex) ||
        verdicts[position];
      if (!match) return;
      perCandidate.set(candidateIndex, [
        {
          verdict: normalizeVerdict(match.verdict),
          reason: stringOr(match.reason, "no reason given"),
          severityAdjustment:
            match.severityAdjustment === "lower" ? "lower" : "keep",
          lens: "single",
        },
      ]);
    });
  });
  return perCandidate;
}

function reviewPrompt(settings, candidates, indexes, lens) {
  const lines = [
    `扫描根目录（绝对路径）：${settings.scanRoot}`,
    `扫描范围：${settings.scopeDetail || settings.scope}`,
  ];

  if (settings.mode === "changes" && settings.range) {
    lines.push(
      `这是审一段改动：diff 用 \`${GIT} diff ${settings.range.base}...${settings.range.head}\` 取。`,
    );
  }

  if (lens) {
    lines.push(
      "",
      `本轮你只看一个视角（${lens.id}）：`,
      lens.ask,
      "不属于你这个视角的判断留给别的复核者，不要越界。",
    );
  }

  const payload = indexes.map((index) => ({
    findingIndex: index,
    title: candidates[index].title,
    cweId: candidates[index].cweId,
    location: candidates[index].location,
    snippet: candidates[index].snippet,
    evidence: candidates[index].evidence,
  }));

  lines.push(
    "",
    "你要判的候选（编号是 findingIndex，请原样回填）：",
    JSON.stringify(payload, null, 2),
    "",
    "注意：只给判定，不要修改任何文件。严重度只能往下调，不能上调——想上调就写进 reason，不要动 tier。",
    '返回 {"verdicts": [...]}，元素形状按你 agent 说明里那一节（findingIndex / verdict / reason / reachability / severityAdjustment），不要返回数组本身。',
  );
  return lines.join("\n");
}

function normalizeVerdict(value) {
  if (value === "confirmed" || value === "rejected") return value;
  return "uncertain";
}

/**
 * 仲裁：确认票过半才进 findings[]；其余全部进 rejected[]，连同理由一起——不
 * 确定不是「再想想」，是这一轮没确认，报告里如实写。
 */
function settleFindings(candidates, verdictsByCandidate) {
  const findings = [];
  const rejected = [];

  candidates.forEach((candidate, index) => {
    const votes = verdictsByCandidate.get(index) || [];
    const confirmed = votes.filter((vote) => vote.verdict === "confirmed").length;
    const rejectedVotes = votes.filter(
      (vote) => vote.verdict === "rejected",
    ).length;
    const total = votes.length;

    let outcome = "uncertain";
    if (total > 0 && confirmed * 2 > total) outcome = "confirmed";
    else if (total > 0 && rejectedVotes * 2 > total) outcome = "rejected";

    const reason =
      votes.map((vote) => `[${vote.lens}] ${vote.reason}`).join(" ｜ ") ||
      "没有复核者给出判定（复核那一步失败了）";
    const lowered = votes.some((vote) => vote.severityAdjustment === "lower");

    if (outcome === "confirmed") {
      findings.push({
        ...candidate,
        severity: lowered
          ? lowerSeverity(candidate.severity)
          : candidate.severity,
        verification: {
          verdict: "confirmed",
          reason,
          severityAdjustment: lowered ? "lower" : "keep",
        },
      });
      return;
    }

    rejected.push({
      title: candidate.title,
      fromHunter: candidate.areas.join(", "),
      reason,
      location: candidate.location,
    });
  });

  return { findings, rejected };
}

function lowerSeverity(value) {
  if (value === "critical") return "high";
  if (value === "high") return "medium";
  if (value === "medium") return "low";
  return "low";
}
