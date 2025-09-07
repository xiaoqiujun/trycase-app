let isTauri = "__TAURI__" in window
let tauriConfirm: any = null

if (isTauri) {
  import("@tauri-apps/plugin-dialog").then((m) => {
    tauriConfirm = m.confirm
  })
}

export async function confirmDialog(message: string, title = "提示"): Promise<boolean> {
  if (isTauri && tauriConfirm) {
    return await tauriConfirm(message, { title, type: "warning" })
  } else {
    return window.confirm(message)
  }
}