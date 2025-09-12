import { useEffect, useRef } from "react"
import mermaid from "mermaid"

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

  return <div ref={ref} className="border p-2 rounded bg-white overflow-auto" />
}

export default MermaidChart
