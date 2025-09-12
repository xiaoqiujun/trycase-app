import type { TestCase } from "@/types"

const TestCasePreview = ({ testCases }: { testCases: TestCase[] }) => (
  <div className="p-4 bg-gray-50 rounded">
    {testCases.map((c) => (
      <div key={c.id} className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="text-lg font-semibold text-blue-800">
          {c.id}: {c.title}
        </h2>
        <p className="text-gray-600 mt-1 italic">
          前置条件: {c.precondition || "无"}
        </p>
        <ol className="list-decimal list-inside mt-3 space-y-1">
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
            </li>
          ))}
        </ol>
      </div>
    ))}
  </div>
)

export default TestCasePreview
