import * as XLSX from "xlsx"
import type { TestGroup } from "@/types"
import JSZip from "jszip"

/** Excel 导出 */
export function exportToExcel(groups: TestGroup[]) {
  const rows: any[] = []
  groups.forEach((g) => {
    g.cases.forEach((c) => {
      rows.push({
        分组: g.name,
        用例ID: c.id,
        标题: c.title,
        前置条件: c.precondition,
        步骤: c.steps
          .map((s, idx) => {
            const branchStr =
              s.branches?.map((b) => `[${b.condition} -> 步骤 ${b.nextStep + 1}]`).join(", ") || ""
            return `步骤 ${idx + 1}: ${s.action} | ${s.expectedStatus} | ${s.expectedValue} ${branchStr}`
          })
          .join("\n"),
      })
    })
  })

  const sheet = XLSX.utils.json_to_sheet(rows)

  // 设置列宽
  sheet["!cols"] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 30 },
    { wch: 40 },
    { wch: 80 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, "TestGroups")
  XLSX.writeFile(wb, "testcase.xlsx")
}

/** JSON 导出 */
export function exportToJSON(groups: TestGroup[]) {
  const blob = new Blob([JSON.stringify(groups, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "testcase.json"
  a.click()
  URL.revokeObjectURL(url)
}

/** HTML 导出 */
export function exportToHTML(groups: TestGroup[]) {
  let html = `<html><head><meta charset="utf-8"><title>测试用例分组</title>
  <style>
    body { font-family: Arial, sans-serif; padding:20px; }
    h1 { color:#2563eb; }
    .group { border:1px solid #ccc; margin:10px 0; padding:10px; border-radius:8px; }
    .case { margin:10px 0; padding:10px; background:#f9f9f9; border-radius:6px; }
    .step { margin:5px 0; }
    .success { color:green; font-weight:bold; }
    .fail { color:red; font-weight:bold; }
    .warn { color:orange; font-weight:bold; }
  </style></head><body>
  <h1>测试用例分组</h1>`

  groups.forEach((g) => {
    html += `<div class="group"><h2>${g.id}: ${g.name}</h2>`
    g.cases.forEach((c) => {
      html += `<div class="case"><h3>${c.id}: ${c.title}</h3><p><em>前置条件: ${
        c.precondition || "无"
      }</em></p><ol>`
      c.steps.forEach((s, idx) => {
        const cls =
          s.expectedStatus === "成功"
            ? "success"
            : s.expectedStatus === "失败"
            ? "fail"
            : "warn"
        html += `<li class="step">S${idx + 1}: ${s.action} <span class="${cls}">${
          s.expectedStatus
        }</span> (期望值: ${s.expectedValue || "无"})</li>`
      })
      html += "</ol></div>"
    })
    html += "</div>"
  })

  html += "</body></html>"

  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "testcase.html"
  a.click()
  URL.revokeObjectURL(url)
}

/** XMind 导出 (JSON 格式模拟) */
export function exportToXMindJson(groups: TestGroup[]) {
  // XMind 实际是压缩包，这里先生成结构 JSON 模拟
  const xmindData = {
    rootTopic: {
      title: "测试用例分组",
      children: groups.map((g) => ({
        title: g.name,
        children: g.cases.map((c) => ({
          title: `${c.id}: ${c.title}`,
          children: c.steps.map((s, idx) => ({
            title: `S${idx + 1}: ${s.action} (${s.expectedStatus})`,
          })),
        })),
      })),
    },
  }

  const blob = new Blob([JSON.stringify(xmindData, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "testcase.xmind.json" // 临时保存 JSON 形式
  a.click()
  URL.revokeObjectURL(url)
}

/** 导出 XMind 文件 */
export async function exportToXMind(groups: TestGroup[]) {
  // 生成 XMind 内容结构
  const content = [
    {
      id: "root-" + Date.now(),
      title: "测试用例分组",
      rootTopic: {
        id: "topic-root",
        title: "测试用例分组",
        children: {
          attached: groups.map((g) => ({
            id: g.id,
            title: g.name,
            children: {
              attached: g.cases.map((c) => ({
                id: c.id,
                title: `${c.id}: ${c.title}`,
                children: {
                  attached: c.steps.map((s, idx) => ({
                    id: `${c.id}-s${idx + 1}`,
                    title: `S${idx + 1}: ${s.action} (${s.expectedStatus})`,
                  })),
                },
              })),
            },
          })),
        },
      },
    },
  ]

  const metadata = {
    creator: "TestCase System",
    timestamp: new Date().toISOString(),
    version: "1.0",
  }

  // 用 JSZip 打包
  const zip = new JSZip()
  zip.file("content.json", JSON.stringify(content, null, 2))
  zip.file("metadata.json", JSON.stringify(metadata, null, 2))

  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "testcase.xmind"
  a.click()
  URL.revokeObjectURL(url)
}