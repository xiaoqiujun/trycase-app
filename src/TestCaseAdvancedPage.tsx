import { useEffect, useState, useRef } from "react"
import { saveAs } from "file-saver"
import * as XLSX from "xlsx"
import ExcelJS from "exceljs"
import mermaid from "mermaid"
import { Workbook, RootTopic, Topic } from "xmind-generator"
import domtoimage from "dom-to-image"
import { confirmDialog } from "./utils/dialog"
import { storage } from "./utils/storage"
import { logger } from "./utils/logger"
import { version } from "../package.json"

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

// ===================== Flowchart Mermaid =====================
const generateMermaid = (c: TestCase) => {
	let code = "flowchart TD\n"

	c.steps.forEach((s, idx) => {
		const expectedValue = s.expectedValue || "无"
		code += `S${idx}["S${idx + 1}: ${s.action} | ${s.expectedStatus} | ${expectedValue}"]\n`
	})

	// 顺序/回溯
	c.steps.forEach((s, idx) => {
		if (s.dependsOn !== undefined) {
			code += `S${idx} -.-> S${s.dependsOn}\n` // 回溯用虚线
		} else if (idx < c.steps.length - 1) {
			code += `S${idx} --> S${idx + 1}\n`
		}
	})

	// 条件分支
	c.steps.forEach((s, idx) => {
		if (s.branches && s.branches.length > 0) {
			const branchNode = `D${idx}{条件分支}`
			code += `${branchNode}\nS${idx} --> ${branchNode}\n`
			s.branches.forEach((b) => {
				code += `${branchNode} -->|${b.condition}| S${b.nextStep}\n`
			})
		}
	})

	// 节点颜色
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

// ===================== Mermaid Chart =====================
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
			<div className="mt-2 flex gap-2">
				<button onClick={exportSVG} className="bg-blue-500 text-white px-2 py-1 rounded">
					导出 SVG
				</button>
				<button onClick={exportPNG} className="bg-green-500 text-white px-2 py-1 rounded">
					导出 PNG
				</button>
			</div>
		</div>
	)
}

// ===================== 测试用例预览 =====================
interface PreviewProps {
	testCases: TestCase[]
}

const TestCasePreview: React.FC<PreviewProps> = ({ testCases }) => (
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
										↩ 回溯至: <abbr title={c.steps[s.dependsOn]?.action}>S{s.dependsOn + 1}</abbr>{" "}
										{c.steps[s.dependsOn]?.action}
									</div>
								)}
								{s.branches && s.branches.length > 0 && (
									<ul className="ml-6 list-disc list-inside mt-1">
										{s.branches.map((b, bi) => (
											<li key={bi} className="text-purple-700 mb-2">
												<abbr title={b.condition}>
													<span className="bg-gray-300 p-1 rounded mr-1">
														C{idx + 1}.{bi + 1}
													</span>
													{b.condition}
												</abbr>{" "}
												→ 下一步:{" "}
												<span className="text-blue-700 font-bold">
													{c.steps[b.nextStep]?.action}
													<abbr title={c.steps[b.nextStep]?.action}>
														（S{b.nextStep + 1}）
													</abbr>
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

// ===================== 主页面 =====================
export default function TestCaseAdvancedPage() {
	const [cases, setCases] = useState<TestCase[]>([])
	const [title, setTitle] = useState("")
	const [precondition, setPrecondition] = useState("")
	const [steps, setSteps] = useState<Step[]>([{ action: "", expectedStatus: "成功", expectedValue: "" }])
	const [editingId, setEditingId] = useState<string | null>(null)

	useEffect(() => {
		const loadCases = async () => {
			try {
				const saved = await storage.get(STORAGE_KEY)
				setCases(JSON.parse(saved || "[]"))
			} catch (e) {
				logger.error(`加载用例失败:${String(e)}`)
			}
		}
		loadCases()
	}, [])

	useEffect(() => {
		storage.set(STORAGE_KEY, JSON.stringify(cases))
	}, [cases])

	// ==== 表单操作 ====
	const resetForm = () => {
		setTitle("")
		setPrecondition("")
		setSteps([{ action: "", expectedStatus: "成功", expectedValue: "" }])
		setEditingId(null)
	}
	const addStep = () => setSteps([...steps, { action: "", expectedStatus: "成功", expectedValue: "" }])
	const deleteStep = (idx: number) => {
		if (steps.length === 1) return
		setSteps(steps.filter((_, i) => i !== idx))
	}

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
		resetForm()
	}
	const deleteCase = (id: string) => {
		confirmDialog("确定删除该用例吗？").then((confirmed) => {
			if (confirmed) setCases(cases.filter((c) => c.id !== id))
		})
	}
	const clearCases = () => {
		confirmDialog("确定清空所有用例吗？").then((confirmed) => {
			if (confirmed) {
				setCases([])
				localStorage.removeItem(STORAGE_KEY)
			}
		})
	}

	// ==== 导出功能 ====
	const exportExcel = async () => {
		const workbook = new ExcelJS.Workbook()
		const worksheet = workbook.addWorksheet("TestCases")

		worksheet.columns = [
			{ header: "ID", key: "id", width: 18 },
			{ header: "标题", key: "title", width: 30 },
			{ header: "前置条件", key: "pre", width: 40 },
			{ header: "步骤", key: "steps", width: 80 },
		]

		// 表头加粗
		worksheet.getRow(1).font = { bold: true }

		cases.forEach((c) => {
			// 行对象
			const row = worksheet.addRow({
				id: c.id,
				title: c.title,
				pre: c.precondition,
			})

			// === 步骤列（要处理彩色状态） ===
			const stepsCell = row.getCell("steps")
			stepsCell.value = {
				richText: c.steps
					.map((s, idx) => {
						let color = "FF9900" // 默认橙色
						if (s.expectedStatus === "成功") color = "00AA00"
						else if (s.expectedStatus === "失败") color = "CC0000"

						const branchStr =
							s.branches?.map((b) => `[${b.condition} -> 步骤 ${b.nextStep + 1}]`).join(", ") || ""

						return [
							{
								text: `步骤 ${idx + 1}: ${s.action} | `,
								font: { color: { argb: "000000" } }, // 普通黑色
							},
							{
								text: `${s.expectedStatus}`, // 状态
								font: { color: { argb: color }, bold: true },
							},
							{
								text: ` | ${s.expectedValue} ${branchStr}\n`,
								font: { color: { argb: "000000" } },
							},
						]
					})
					.flat(),
			}

			// 设置单元格样式（左上对齐 + 自动换行）
			stepsCell.alignment = { wrapText: true, vertical: "top", horizontal: "left" }

			// 动态行高（按换行数估算）
			const stepLines = c.steps.length
			row.height = Math.max(35, stepLines * 35)

			// 其他列也左上对齐
			row.eachCell((cell, colNum) => {
				if (colNum !== 4) {
					// 除了步骤列
					cell.alignment = { wrapText: true, vertical: "top", horizontal: "left" }
				}
			})
		})

		const buffer = await workbook.xlsx.writeBuffer()
		saveAs(new Blob([buffer]), "testcases.xlsx")
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
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-6 bg-gray-100">
${cases
	.map(
		(c) => `<div class="bg-white rounded-xl shadow-md p-6 mb-4">
<h2 class="text-xl font-semibold text-blue-800">${c.id}: ${c.title}</h2>
<p class="text-gray-700 italic mt-2">前置条件: ${c.precondition || "无"}</p>
<ol class="list-decimal list-inside mt-4 space-y-2">
${c.steps
	.map(
		(s, idx) => `<li class="flex flex-col gap-1">
<div class="flex items-center gap-2 flex-wrap">
<span class="text-blue-700 font-bold"><span class="bg-gray-300 p-1 rounded mr-1">S${idx + 1}</span>${s.action}</span>
<span class="${
			s.expectedStatus === "成功"
				? "text-green-700 bg-green-100 px-2 rounded"
				: s.expectedStatus === "失败"
				? "text-red-700 bg-red-100 px-2 rounded"
				: "text-orange-700 bg-orange-100 px-2 rounded"
		}">${s.expectedStatus}</span>
<span class="bg-gray-100 px-2 rounded text-gray-800">期望值: ${s.expectedValue || "无"}</span>
</div>
${
	s.dependsOn !== undefined
		? `<div class="text-yellow-600 font-semibold ml-6">↩ 回溯至: S${s.dependsOn + 1} ${
				c.steps[s.dependsOn]?.action
		  }</div>`
		: ""
}
${
	s.branches && s.branches.length > 0
		? `<ul class="ml-6 list-disc list-inside mt-1">${s.branches
				.map(
					(b, bi) =>
						`<li class="text-purple-700 mb-2"><span class="bg-gray-300 p-1 rounded mr-1">C${idx + 1}.${
							bi + 1
						}</span>${b.condition} → 下一步: S${b.nextStep + 1} ${c.steps[b.nextStep]?.action}</li>`
				)
				.join("")}</ul>`
		: ""
}
</li>`
	)
	.join("")}
</ol></div>`
	)
	.join("")}
</body>
</html>`
		saveAs(new Blob([html], { type: "text/html" }), "testcases.html")
	}

	const exportJson = () => {
		const json = JSON.stringify(cases, null, 2)
		saveAs(new Blob([json], { type: "application/json" }), "testcases.json")
	}

	const importDemo = () => {
		const demoCases: TestCase[] = [
			{
				id: "TC-LOGIN-001",
				title: "用户使用正确账号密码登录系统",
				precondition:
					"1. 系统已部署并正常运行\n2. 测试用户已注册（账号：test@example.com，密码：Test123456）\n3. 用户处于未登录状态",
				steps: [
					{
						action: "访问系统登录页面",
						expectedStatus: "成功",
						expectedValue: "登录页面正常显示，包含账号输入框、密码输入框、登录按钮",
						branches: [],
					},
					{
						action: "在账号输入框中输入'test@example.com'",
						expectedStatus: "成功",
						expectedValue: "输入框内容正确显示为'test@example.com'",
						branches: [],
					},
					{
						action: "在密码输入框中输入'Test123456'",
						expectedStatus: "成功",
						expectedValue: "输入框显示为加密字符（如******）",
						branches: [],
					},
					{
						action: "点击登录按钮",
						expectedStatus: "成功",
						expectedValue: "系统验证通过，跳转到首页",
						branches: [
							{
								condition: "账号或密码错误",
								nextStep: 4,
							},
							{
								condition: "需要验证码",
								nextStep: 5,
							},
						],
					},
					{
						action: "系统显示错误提示'账号或密码错误'",
						expectedStatus: "失败",
						expectedValue: "错误提示正确显示，登录状态未改变",
						branches: [],
					},
					{
						action: "输入正确的验证码并点击确认",
						expectedStatus: "成功",
						expectedValue: "验证码验证通过，跳转到首页",
						branches: [
							{
								condition: "验证码错误",
								nextStep: 6,
							},
						],
					},
					{
						action: "系统显示错误提示'验证码错误，请重新输入'",
						expectedStatus: "失败",
						expectedValue: "错误提示正确显示，保持在验证码输入界面",
						branches: [],
						dependsOn: 5,
					},
				],
			},
		]
		setCases(demoCases)
	}

	return (
		<div className="p-6 max-w-5xl mx-auto">
			<h1 className="text-2xl font-bold mb-4 flex justify-between">
				测试用例管理 v{version}
				<button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={importDemo}>
					示例用例
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

				{steps.map((s, i) => (
					<div key={i} className="border p-2 rounded bg-white space-y-1">
						S{i + 1}
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
							<select
								className="border p-1 rounded"
								value={s.dependsOn !== undefined ? s.dependsOn : ""}
								onChange={(e) => {
									const ns = [...steps]
									ns[i].dependsOn = e.target.value !== "" ? parseInt(e.target.value) : undefined
									setSteps(ns)
								}}
							>
								<option value="">无回溯</option>
								{steps.map((step, idx) => (
									<option key={idx} value={idx}>
										S{idx + 1}: {step.action}
									</option>
								))}
							</select>
							<button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => deleteStep(i)}>
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
										value={b.nextStep}
										onChange={(e) => {
											const ns = [...steps]
											ns[i].branches![bi].nextStep = parseInt(e.target.value)
											setSteps(ns)
										}}
									>
										{steps.map((step, idx) => (
											<option key={idx} value={idx}>
												S{idx + 1}: {step.action || `步骤 ${idx + 1}`}
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
				<button className="bg-orange-600 text-white px-4 py-2 rounded" onClick={exportJson}>
					导出 JSON
				</button>
				<button className="bg-red-600 text-white px-4 py-2 rounded" onClick={clearCases}>
					清空所有用例
				</button>
			</div>
		</div>
	)
}
