import { invoke } from "@tauri-apps/api/core";
import { showNotice } from "./notice";

export const openWebUrl = async (url: string) => {
  try {
    await invoke("open_web_url", { url });
  } catch (err: any) {
    showNotice("error", err.toString());
  }
};