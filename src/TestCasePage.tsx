import { useEffect, useState, useRef } from "react"
import { saveAs } from "file-saver"
import * as XLSX from "xlsx"
import mermaid from "mermaid"
import { Workbook, RootTopic, Topic } from "xmind-generator"
import domtoimage from "dom-to-image"

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

const statusColor = (status: string) => {
	switch (status) {
		case "成功":
			return "green"
		case "失败":
			return "red"
		case "异常":
			return "orange"
		default:
			return "black"
	}
}

const generateMermaid = (c: TestCase) => {
	let code = "graph TD\n"

	// 定义节点：操作 | 状态 | 期望值
	c.steps.forEach((s, idx) => {
		const expectedValue = s.expectedValue || "无"
		code += `S${idx}["${s.action} | ${s.expectedStatus} | ${expectedValue}"]\n`
	})

	// 定义依赖和分支
	c.steps.forEach((s, idx) => {
		if (s.dependsOn !== undefined) code += `S${s.dependsOn} --> S${idx}\n`
		s.branches?.forEach((b) => (code += `S${idx} -->|${b.condition}| S${b.nextStep}\n`))
	})

	// 定义节点颜色
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
interface PreviewProps {
	testCases: TestCase[]
}
const TestCasePreview: React.FC<PreviewProps> = ({ testCases }) => {
	return (
		<div className="p-6 bg-gray-100 mt-3">
			<header className="text-center mb-6">
				<h1 className="text-3xl font-bold text-blue-600">测试用例预览</h1>
			</header>

			<main className="max-w-4xl mx-auto space-y-6">
				{testCases.map((c) => (
					<div key={c.id} className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-semibold text-blue-800">
							{c.id}: {c.title}
						</h2>
						<p className="text-gray-700 italic mt-2">前置条件: {c.precondition || "无"}</p>
						<ol className="list-decimal list-inside mt-4 space-y-2">
							{c.steps.map((s, idx) => (
								<li key={idx} className="flex flex-col gap-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="text-blue-700 font-bold">
											<span className="bg-gray-300 p-1 rounded mr-1">S{idx + 1}</span>
											{s.action}
											<abbr title={s.action}></abbr>
										</span>
										<span
											className={
												s.expectedStatus === "成功"
													? "text-green-700 bg-green-100 px-2 rounded"
													: s.expectedStatus === "失败"
													? "text-red-700 bg-red-100 px-2 rounded"
													: "text-orange-700 bg-orange-100 px-2 rounded"
											}
										>
											{s.expectedStatus}
										</span>
										<span className="bg-gray-100 px-2 rounded text-gray-800">
											期望值: {s.expectedValue || "无"}
										</span>
									</div>
									{s.dependsOn !== undefined && (
										<div className="text-yellow-600 font-semibold ml-6">
											↩ 回溯至:{" "}
											<abbr title={c.steps[s.dependsOn]?.action}>S{s.dependsOn + 1}</abbr>{" "}
											{c.steps[s.dependsOn]?.action}
										</div>
									)}
									{s.branches && s.branches.length > 0 && (
										<ul className="ml-6 list-disc list-inside mt-1">
											{s.branches.map((b, bi) => (
												<li key={bi} className="text-purple-700 mb-2">
													<abbr title={b.condition}>
														<span className="bg-gray-300 p-1 rounded mr-1">
															C{`${idx + 1}.${bi + 1}`}
														</span>
														{b.condition}
													</abbr>{" "}
													→ 下一步:{" "}
													<span className="text-blue-700 font-bold">
														{c.steps[b.nextStep]?.action}
														<abbr title={c.steps[b.nextStep]?.action}>
															（S{b.nextStep + 1}）
														</abbr>{" "}
													</span>
												</li>
											))}
										</ul>
									)}
								</li>
							))}
						</ol>
					</div>
				))}
			</main>
		</div>
	)
}

const MermaidChart = ({ code }: { code: string }) => {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		mermaid.initialize({ startOnLoad: false, theme: "default" })
		if (ref.current) {
			try {
				// 清空之前内容
				ref.current.innerHTML = ""
				// 创建新的 div 加 class mermaid
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

	const exportSVG = () => {
		if (ref.current) {
			domtoimage.toSvg(ref.current).then((dataUrl) => {
				const blob = new Blob([dataUrl], { type: "image/svg+xml" })
				saveAs(blob, "flowchart.svg")
			})
		}
	}

	const exportPNG = () => {
		if (ref.current) {
			domtoimage.toPng(ref.current).then((dataUrl) => {
				const link = document.createElement("a")
				link.href = dataUrl
				link.download = "flowchart.png"
				link.click()
			})
		}
	}

	return (
		<div>
			<div ref={ref} className="border p-2 rounded mb-4 bg-white overflow-auto" />
			<div className="mt-2">
				<button onClick={exportSVG} className="bg-blue-500 text-white px-2 py-1 mr-2">
					导出 SVG
				</button>
				<button onClick={exportPNG} className="bg-green-500 text-white px-2 py-1">
					导出 PNG
				</button>
			</div>
		</div>
	)
}

export default function TestCaseAdvancedPage() {
	const [cases, setCases] = useState<TestCase[]>(() => {
		const saved = localStorage.getItem(STORAGE_KEY)
		if (saved) return JSON.parse(saved)
		return []
	})

	const [title, setTitle] = useState("")
	const [precondition, setPrecondition] = useState("")
	const [steps, setSteps] = useState<Step[]>([{ action: "", expectedStatus: "成功", expectedValue: "" }])
	const [editingId, setEditingId] = useState<string | null>(null)

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
	}, [cases])

	const resetForm = () => {
		setTitle("")
		setPrecondition("")
		setSteps([{ action: "", expectedStatus: "成功", expectedValue: "" }])
	}

	const addCase = () => {
		const id = `TC-${cases.length + 1}`
		setCases([...cases, { id, title, precondition, steps: steps.map((s) => ({ ...s })) }])
		resetForm()
	}

	const editCase = (tc: TestCase) => {
		setEditingId(tc.id)
		setTitle(tc.title)
		setPrecondition(tc.precondition)
		setSteps(tc.steps.map((s) => ({ ...s, branches: s.branches ? [...s.branches] : [] })))
	}

	const saveCase = () => {
		if (!editingId) return
		setCases(
			cases.map((c) =>
				c.id === editingId ? { ...c, title, precondition, steps: steps.map((s) => ({ ...s })) } : c
			)
		)
		setEditingId(null)
		resetForm()
	}

	const deleteCase = (id: string) => {
		if (confirm("确定删除该用例吗？")) setCases(cases.filter((c) => c.id !== id))
	}
	const clearCases = () => {
		if (confirm("确定清空所有用例吗？")) {
			setCases([])
			localStorage.removeItem(STORAGE_KEY)
		}
	}

	const addStep = () => setSteps([...steps, { action: "", expectedStatus: "成功", expectedValue: "" }])
	const deleteStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx))
	const addBranch = (stepIdx: number) => {
		const ns = [...steps]
		if (!ns[stepIdx].branches) ns[stepIdx].branches = []
		ns[stepIdx].branches.push({ condition: "", nextStep: 0 })
		setSteps(ns)
	}
	const deleteBranch = (stepIdx: number, branchIdx: number) => {
		const ns = [...steps]
		ns[stepIdx].branches!.splice(branchIdx, 1)
		setSteps(ns)
	}

	const exportExcel = () => {
		const rows = cases.map((c) => ({
			ID: c.id,
			标题: c.title,
			前置条件: c.precondition,
			步骤: c.steps
				.map((s, idx) => {
					const branchStr =
						s.branches?.map((b) => `[${b.condition} -> 步骤 ${b.nextStep + 1}]`).join(", ") || ""
					return `步骤 ${idx + 1}: ${s.action} | ${s.expectedStatus} | ${s.expectedValue} ${branchStr}`
				})
				.join("\n"),
		}))
		const sheet = XLSX.utils.json_to_sheet(rows)
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, sheet, "TestCases")
		XLSX.writeFile(wb, "testcases.xlsx")
	}

	const exportXMind = async () => {
		const root = RootTopic("测试用例").children(
			cases.map((c) =>
				Topic(`${c.id}: ${c.title}`)
					.note(c.precondition || "")
					.children(
						c.steps.map((s, idx) => {
							const stepTopic = Topic(`步骤 ${idx + 1}: ${s.action} [${s.expectedStatus}]`).note(
								s.expectedValue
							)
							if (s.branches)
								stepTopic.children(
									s.branches.map((b) => Topic(`分支: ${b.condition} -> 步骤 ${b.nextStep + 1}`))
								)
							return stepTopic
						})
					)
			)
		)
		const workbook = Workbook(root)
		const buffer = await workbook.archive()
		saveAs(new Blob([buffer], { type: "application/octet-stream" }), "testcases.xmind")
	}

	const exportHtml = () => {
		const html = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <title>测试用例导出</title>
  <!-- 引入 Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-6 bg-gray-100">
  <header class="text-center mb-6">
    <h1 class="text-3xl font-bold text-blue-600">测试用例预览</h1>
  </header>

  <main class="max-w-4xl mx-auto space-y-6">
    ${cases
		.map(
			(c) => `
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-xl font-semibold text-blue-800">${c.id}: ${c.title}</h2>
        <p class="text-gray-700 italic mt-2">前置条件: ${c.precondition || "无"}</p>
        <ol class="list-decimal list-inside mt-4 space-y-2">
          ${c.steps
				.map(
					(s, idx) => `
            <li class="flex flex-col gap-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-blue-700 font-bold">
                  <span class="bg-gray-300 p-1 rounded mr-1">S${idx + 1}</span>
                  ${s.action}
                </span>
                <span class="${
					s.expectedStatus === "成功"
						? "text-green-700 bg-green-100 px-2 rounded"
						: s.expectedStatus === "失败"
						? "text-red-700 bg-red-100 px-2 rounded"
						: "text-orange-700 bg-orange-100 px-2 rounded"
				}">${s.expectedStatus}</span>
                <span class="bg-gray-100 px-2 rounded text-gray-800">
                  期望值: ${s.expectedValue || "无"}
                </span>
              </div>
              ${
					s.dependsOn !== undefined
						? `<div class="text-yellow-600 font-semibold ml-6">
                    ↩ 回溯至: S${s.dependsOn + 1} ${c.steps[s.dependsOn]?.action}
                  </div>`
						: ""
				}
              ${
					s.branches && s.branches.length > 0
						? `<ul class="ml-6 list-disc list-inside mt-1">
                      ${s.branches
							.map(
								(b, bi) => `
                          <li class="text-purple-700 mb-2">
                            <span class="bg-gray-300 p-1 rounded mr-1">C${idx + 1}.${bi + 1}</span>
                            ${b.condition} → 下一步:
                            <span class="text-blue-700 font-bold">S${b.nextStep + 1} ${
									c.steps[b.nextStep]?.action || ""
								}</span>
                          </li>`
							)
							.join("")}
                    </ul>`
						: ""
				}
            </li>`
				)
				.join("")}
        </ol>
      </div>`
		)
		.join("")}
  </main>
</body>
</html>
`
		saveAs(new Blob([html], { type: "text/html" }), "testcases.html")
	}

	const importDemo = () => {
		const cases:TestCase[] = []
		setCases(cases)
	}

	return (
		<div className="p-6 max-w-5xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">
				测试用例管理{" "}
				<button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={importDemo}>
					导入示例用例
				</button>
			</h1>

			{/* 表单 */}
			<div className="border p-4 rounded mb-4 space-y-2 bg-gray-50">
				<input
					className="border p-2 w-full rounded"
					placeholder="用例标题"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
				/>
				<textarea
					className="border p-2 w-full rounded"
					placeholder="前置条件"
					value={precondition}
					onChange={(e) => setPrecondition(e.target.value)}
				/>
				<div className="space-y-2">
					{steps.map((s, i) => (
						<div key={i} className="border p-2 rounded bg-white space-y-1">
							<div className="flex gap-2 items-center">
								<input
									className="border p-1 flex-1 rounded"
									placeholder="操作"
									value={s.action}
									onChange={(e) => {
										const ns = [...steps]
										ns[i].action = e.target.value
										setSteps(ns)
									}}
								/>
								<select
									className="border p-1 rounded"
									value={s.expectedStatus}
									onChange={(e) => {
										const ns = [...steps]
										ns[i].expectedStatus = e.target.value as any
										setSteps(ns)
									}}
								>
									<option value="成功">成功</option>
									<option value="失败">失败</option>
									<option value="异常">异常</option>
								</select>
								<input
									className="border p-1 flex-1 rounded"
									placeholder="期望值"
									value={s.expectedValue}
									onChange={(e) => {
										const ns = [...steps]
										ns[i].expectedValue = e.target.value
										setSteps(ns)
									}}
								/>
								<button
									className="bg-red-500 text-white px-2 py-1 rounded"
									onClick={() => deleteStep(i)}
								>
									删除步骤
								</button>
							</div>
							{/* 分支 */}
							<div className="ml-4">
								{s.branches?.map((b, bi) => (
									<div key={bi} className="flex gap-2 items-center mb-1">
										<input
											className="border p-1 rounded"
											placeholder="分支条件"
											value={b.condition}
											onChange={(e) => {
												const ns = [...steps]
												ns[i].branches![bi].condition = e.target.value
												setSteps(ns)
											}}
										/>
										<select
											value={steps[s.branches![bi].nextStep]?.action || ""}
											onChange={(e) => {
												const ns = [...steps]
												// 找到选中操作对应的步骤索引
												const targetIdx = ns.findIndex((step) => step.action === e.target.value)
												if (targetIdx !== -1) {
													ns[i].branches![bi].nextStep = targetIdx
													setSteps(ns)
												}
											}}
										>
											{steps.map((step, idx) => (
												<option key={idx} value={step.action || `步骤 ${idx + 1}`}>
													{step.action || `步骤 ${idx + 1}`}
												</option>
											))}
										</select>
										<button
											className="bg-red-500 text-white px-2 py-1 rounded"
											onClick={() => deleteBranch(i, bi)}
										>
											删除分支
										</button>
									</div>
								))}
								<button
									className="bg-green-500 text-white px-2 py-1 rounded mt-1"
									onClick={() => addBranch(i)}
								>
									+ 添加分支
								</button>
							</div>
						</div>
					))}
				</div>
				<button className="bg-gray-200 px-3 py-1 rounded" onClick={addStep}>
					+ 添加步骤
				</button>
				<div className="mt-2">
					{editingId ? (
						<button className="bg-green-600 text-white px-4 py-2 rounded" onClick={saveCase}>
							保存修改
						</button>
					) : (
						<button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={addCase}>
							添加用例
						</button>
					)}
				</div>
			</div>

			{/* 用例列表 */}
			{cases.map((c) => (
				<div key={c.id}>
					<div className="mb-2 flex justify-between items-center">
						<h2 className="text-lg font-semibold">
							{c.id}: {c.title}
						</h2>
						<div className="flex gap-2">
							<button className="bg-yellow-400 text-white px-2 py-1 rounded" onClick={() => editCase(c)}>
								编辑
							</button>
							<button
								className="bg-red-600 text-white px-2 py-1 rounded"
								onClick={() => deleteCase(c.id)}
							>
								删除
							</button>
						</div>
					</div>
					<div>前置条件: {c.precondition || "无"}</div>
					<MermaidChart code={generateMermaid(c)} />
					<TestCasePreview testCases={[c]} />
				</div>
			))}

			{/* 导出按钮 */}
			<div className="mt-4 flex gap-2 flex-wrap">
				<button className="bg-green-600 text-white px-4 py-2 rounded" onClick={exportExcel}>
					导出 Excel
				</button>
				<button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={exportXMind}>
					导出 XMind
				</button>
				<button className="bg-orange-600 text-white px-4 py-2 rounded" onClick={exportHtml}>
					导出 HTML 网页
				</button>
				<button className="bg-red-600 text-white px-4 py-2 rounded" onClick={clearCases}>
					清空所有用例
				</button>
			</div>
		</div>
	)
}
