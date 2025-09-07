import { useEffect } from "react"
import TestCasePage from "./TestCasePage"
import TestCaseAdvancedPage from './TestCaseAdvancedPage'
import { logger } from "./utils/logger"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { IconBrandGithub } from "@tabler/icons-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { confirmDialog } from "./utils/dialog"
import { openWebUrl } from "./services/cmds"

function App() {
	useEffect(() => {
		if (process.env.NODE_ENV === 'production') {
			window.addEventListener('contextmenu', (e) => {
				const target = e.target as HTMLElement;
				const selection = window.getSelection()?.toString();
				const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

				// 如果当前是输入框、可编辑区域、或有文字选中，就允许右键
				if (isEditable || selection) {
					return;
				}

				e.preventDefault();
			});
		}
		logger.info("🚀 前端应用程序启动")
		// 带上下文的日志示例
		logger.info("应用环境", {
			isDev: import.meta.env.DEV,
			mode: import.meta.env.MODE,
		})

		// 自动更新逻辑 - 应用加载5秒后检查更新
		const checkForUpdates = async () => {
			try {
				const update = await check()
				console.log(update);
				if (update) {
					logger.info(`有可用更新: ${update.version}`)

					// 显示确认对话框
					const shouldUpdate = await confirmDialog(`有可用更新: ${update.version}\n\n您想现在安装这个更新吗？`)

					if (shouldUpdate) {
						try {
							// 下载并安装，记录进度
							await update.downloadAndInstall((event) => {
								switch (event.event) {
									case "Started":
										logger.info(`开始下载 ${event.data.contentLength} 字节`)
										break
									case "Progress":
										logger.info(`已下载: ${event.data.chunkLength} 字节`)
										break
									case "Finished":
										logger.info("下载完成，正在安装...")
										break
								}
							})

							// 询问用户是否现在重启
							const shouldRestart = confirm("更新安装成功！\n\n您想现在重启应用程序以使用新版本吗？")

							if (shouldRestart) {
								await relaunch()
							}
						} catch (updateError) {
							logger.error(`更新安装失败: ${String(updateError)}`)
							alert(`更新失败: 自动下载过程中出现问题。\n\n${String(updateError)}`)
						}
					}
				}
			} catch (checkError) {
				console.log(checkError)
				logger.error(`更新检查失败: ${String(checkError)}`)
				// 更新检查静默失败 - 不要因网络问题打扰用户
			}
		}

		// 应用加载5秒后检查更新
		const updateTimer = setTimeout(checkForUpdates, 5000)
		return () => clearTimeout(updateTimer)
	}, [])

	const onClick = () => {
		openWebUrl("https://github.com/xiaoqiujun/trycase-app")
	}
	return (
		<div className="w-full h-full">
			<div className="flex p-6 max-w-5xl mx-auto">
				<Tooltip delayDuration={200}>
					<TooltipTrigger asChild>
						<button onClick={onClick} aria-label="项目仓库" className="flex items-center">
							<IconBrandGithub className="w-6 h-6" stroke={2} />
							（一个适合 个人测试人员 或 小团队 的轻量级工具，如果你觉得它好用，欢迎点个 ⭐️ Star 支持！）
						</button>
					</TooltipTrigger>
					<TooltipContent>
						<p>项目仓库</p>
					</TooltipContent>
				</Tooltip>
			</div>
			<TestCaseAdvancedPage />
			{/* <TestCasePage /> */}
		</div>
	)
}

export default App
