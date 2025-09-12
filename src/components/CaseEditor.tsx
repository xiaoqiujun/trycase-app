import { useState } from "react"
import type { Step, TestCase } from "@/types"

const CaseEditor: React.FC<{
  testCase: TestCase
  steps: Step[]
  setSteps: (steps: Step[]) => void
}> = ({ testCase, steps, setSteps }) => {
  const addStep = () =>
    setSteps([
      ...steps,
      { action: "", expectedStatus: "成功", expectedValue: "", branches: [] },
    ])

  const deleteStep = (i: number) => {
    if (steps.length > 1) setSteps(steps.filter((_, idx) => idx !== i))
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

  return (
    <div className="space-y-4">
      {steps.map((s, i) => (
        <div key={i} className="border p-2 rounded bg-white space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">S{i + 1}</span>
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
                ns[i].expectedStatus = e.target.value as Step["expectedStatus"]
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
                ns[i].dependsOn =
                  e.target.value !== "" ? parseInt(e.target.value) : undefined
                setSteps(ns)
              }}
            >
              <option value="">无回溯</option>
              {steps.map((step, idx) => (
                <option key={idx} value={idx}>
                  S{idx + 1}: {step.action || `步骤 ${idx + 1}`}
                </option>
              ))}
            </select>
            <button
              className="bg-red-500 text-white px-2 py-1 rounded"
              onClick={() => deleteStep(i)}
            >
              删除步骤
            </button>
          </div>

          {/* 分支条件 */}
          <div className="ml-6 space-y-1">
            {s.branches?.map((b, bi) => (
              <div key={bi} className="flex gap-2 items-center">
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
              className="bg-green-500 text-white px-2 py-1 rounded"
              onClick={() => addBranch(i)}
            >
              + 添加分支
            </button>
          </div>
        </div>
      ))}
      <button
        className="bg-gray-200 px-3 py-1 rounded"
        onClick={addStep}
      >
        + 添加步骤
      </button>
    </div>
  )
}



export default CaseEditor