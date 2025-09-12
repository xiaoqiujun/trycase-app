import { useEffect, useState, useRef } from "react"
import { saveAs } from "file-saver"
import ExcelJS from "exceljs"
import mermaid from "mermaid"
import { Workbook, RootTopic, Topic } from "xmind-generator"
import domtoimage from "dom-to-image"
import { version } from "../../package.json"

type Branch = { condition: string; nextStep: number }
type Step = {
  action: string
  expectedStatus: "成功" | "失败" | "异常"
  expectedValue: string
  dependsOn?: number
  branches?: Branch[]
}
type TestCase = { id: string; title: string; precondition: string; steps: Step[] }

const STORAGE_KEY = "testcases_advanced"

// ===================== Mermaid 生成 =====================
const generateMermaid = (c: TestCase) => {
  let code = "flowchart TD\n"

  c.steps.forEach((s, idx) => {
    const expectedValue = s.expectedValue || "无"
    code += `S${idx}["S${idx + 1}: ${s.action} | ${s.expectedStatus} | ${expectedValue}"]\n`
  })

  // 顺序 / 回溯
  c.steps.forEach((s, idx) => {
    if (s.dependsOn !== undefined) {
      code += `S${idx} -. 回溯 .-> S${s.dependsOn}\n`
    } else if (idx < c.steps.length - 1) {
      code += `S${idx} --> S${idx + 1}\n`
    }
  })

  // 条件分支
  c.steps.forEach((s, idx) => {
    if (s.branches && s.branches.length > 0) {
      s.branches.forEach((b) => {
        code += `S${idx} -. "${b.condition}" .-> S${b.nextStep}\n`
      })
    }
  })

  // 状态颜色
  c.steps.forEach((s, idx) => {
    code += `class S${idx} ${
      s.expectedStatus === "成功" ? "success" : s.expectedStatus === "失败" ? "fail" : "exception"
    }\n`
  })

  code += `
classDef success fill:#dcfce7,stroke:#22c55e,color:#166534
classDef fail fill:#fee2e2,stroke:#ef4444,color:#b91c1c
classDef exception fill:#ffedd5,stroke:#f97316,color:#9a3412
`

  return code
}

// ===================== Mermaid 渲染组件 =====================
const MermaidChart = ({ code }: { code: string }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "default" })
    if (ref.current) {
      try {
        ref.current.innerHTML = ""
        const div = document.createElement("div")
        div.className = "mermaid"
        div.innerHTML = code
        ref.current.appendChild(div)
        mermaid.init(undefined, div)
      } catch (e) {
        console.error("Mermaid 渲染失败:", e)
      }
    }
  }, [code])

  return <div ref={ref} className="border p-2 rounded mb-4 bg-white overflow-auto" />
}

// ===================== 导出函数 =====================
const exportExcel = async (cases: TestCase[]) => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("TestCases")

  ws.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "标题", key: "title", width: 30 },
    { header: "前置条件", key: "precondition", width: 30 },
    { header: "步骤", key: "steps", width: 80 },
  ]

  cases.forEach((c) => {
    const stepText = c.steps
      .map(
        (s, idx) =>
          `步骤 ${idx + 1}: ${s.action} | ${s.expectedStatus} | ${s.expectedValue || "无"}`
      )
      .join("\n")

    const row = ws.addRow({
      id: c.id,
      title: c.title,
      precondition: c.precondition || "无",
      steps: stepText,
    })

    row.alignment = { vertical: "top", horizontal: "left", wrapText: true }
    if (c.steps.some((s) => s.expectedStatus === "成功")) {
      row.getCell("steps").font = { color: { argb: "228B22" } } // green
    }
    if (c.steps.some((s) => s.expectedStatus === "失败")) {
      row.getCell("steps").font = { color: { argb: "B22222" } } // red
    }
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), "testcases.xlsx")
}

const exportXMind = (cases: TestCase[]) => {
  // const wb = new Workbook()
  // const sheet = wb.createSheet("TestCases")
  // const root = new RootTopic({ title: "测试用例集" })
  // sheet.rootTopic = root

  // cases.forEach((c) => {
  //   const caseTopic = new Topic({ title: `${c.id}: ${c.title}` })
  //   root.addChild(caseTopic)
  //   caseTopic.addChild(new Topic({ title: `前置条件: ${c.precondition || "无"}` }))
  //   c.steps.forEach((s, idx) => {
  //     caseTopic.addChild(
  //       new Topic({
  //         title: `S${idx + 1}: ${s.action} | ${s.expectedStatus} | ${s.expectedValue || "无"}`,
  //       })
  //     )
  //   })
  // })

  // const blob = wb.save()
  // saveAs(blob, "testcases.xmind")
}

const exportHTML = (cases: TestCase[]) => {
  const html = `
  <html>
    <head>
      <meta charset="utf-8"/>
      <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
      <script>mermaid.initialize({ startOnLoad: true })</script>
    </head>
    <body>
      <h1>测试用例预览</h1>
      ${cases
        .map(
          (c) => `
        <h2>${c.id}: ${c.title}</h2>
        <p>前置条件: ${c.precondition || "无"}</p>
        <div class="mermaid">${generateMermaid(c)}</div>
      `
        )
        .join("")}
    </body>
  </html>`
  const blob = new Blob([html], { type: "text/html" })
  saveAs(blob, "testcases.html")
}

const exportJSON = (cases: TestCase[]) => {
  const blob = new Blob([JSON.stringify(cases, null, 2)], { type: "application/json" })
  saveAs(blob, "testcases.json")
}

// ===================== 步骤编辑器 =====================
const CaseEditor = ({ steps, setSteps }: { steps: Step[]; setSteps: (s: Step[]) => void }) => {
  const addStep = () =>
    setSteps([...steps, { action: "", expectedStatus: "成功", expectedValue: "", branches: [] }])

  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="border p-2 rounded bg-white space-y-1">
          <div className="flex gap-2">
            <span>S{i + 1}</span>
            <input
              className="border p-1 flex-1"
              value={s.action}
              placeholder="操作"
              onChange={(e) => {
                const ns = [...steps]
                ns[i].action = e.target.value
                setSteps(ns)
              }}
            />
            <select
              value={s.expectedStatus}
              onChange={(e) => {
                const ns = [...steps]
                ns[i].expectedStatus = e.target.value as Step["expectedStatus"]
                setSteps(ns)
              }}
            >
              <option value="成功">成功</option>
              <option value="失败">失败</option>
              <option value="异常">异常</option>
            </select>
            <input
              className="border p-1 flex-1"
              value={s.expectedValue}
              placeholder="期望值"
              onChange={(e) => {
                const ns = [...steps]
                ns[i].expectedValue = e.target.value
                setSteps(ns)
              }}
            />
          </div>
        </div>
      ))}
      <button className="bg-gray-200 px-2 py-1 rounded" onClick={addStep}>
        + 添加步骤
      </button>
    </div>
  )
}

// ===================== 页面 =====================
export default function TestCaseAdvancedPage() {
  const [cases, setCases] = useState<TestCase[]>([])
  const [title, setTitle] = useState("")
  const [precondition, setPrecondition] = useState("")
  const [steps, setSteps] = useState<Step[]>([
    { action: "", expectedStatus: "成功", expectedValue: "", branches: [] },
  ])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setCases(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
  }, [cases])

  const addCase = () => {
    const id = `TC-${cases.length + 1}`
    setCases([...cases, { id, title, precondition, steps }])
    setTitle("")
    setPrecondition("")
    setSteps([{ action: "", expectedStatus: "成功", expectedValue: "", branches: [] }])
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">测试用例管理 v{version}</h1>

      {/* 表单 */}
      <div className="border p-4 rounded bg-gray-50 mb-4">
        <input
          className="border p-2 w-full mb-2"
          placeholder="用例标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border p-2 w-full mb-2"
          placeholder="前置条件"
          value={precondition}
          onChange={(e) => setPrecondition(e.target.value)}
        />
        <CaseEditor steps={steps} setSteps={setSteps} />
        <button className="bg-blue-600 text-white px-4 py-2 rounded mt-2" onClick={addCase}>
          添加用例
        </button>
      </div>

      {/* 导出 */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => exportExcel(cases)} className="bg-green-600 text-white px-3 py-1 rounded">
          导出 Excel
        </button>
        <button onClick={() => exportXMind(cases)} className="bg-purple-600 text-white px-3 py-1 rounded">
          导出 XMind
        </button>
        <button onClick={() => exportHTML(cases)} className="bg-blue-600 text-white px-3 py-1 rounded">
          导出 HTML
        </button>
        <button onClick={() => exportJSON(cases)} className="bg-gray-600 text-white px-3 py-1 rounded">
          导出 JSON
        </button>
      </div>

      {/* 用例列表 */}
      {cases.map((c) => (
        <div key={c.id} className="mb-6">
          <h2 className="text-lg font-semibold">{c.id}: {c.title}</h2>
          <p>前置条件: {c.precondition || "无"}</p>
          <MermaidChart code={generateMermaid(c)} />
        </div>
      ))}
    </div>
  )
}
