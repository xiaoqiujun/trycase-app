export type Branch = { condition: string; nextStep: number }

export type Step = {
  action: string
  expectedStatus: "成功" | "失败" | "异常"
  expectedValue: string
  dependsOn?: number
  branches?: Branch[]
}

export type TestCase = {
  id: string
  title: string
  precondition: string
  steps: Step[]
}

export type TestGroup = {
  id: string
  name: string
  cases: TestCase[]
  dependsOnGroup?: string
  dependsOnCase?: string
  dependsOnStep?: number
}
