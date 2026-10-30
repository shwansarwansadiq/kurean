"use client";
import { useRef, useState } from "react";
import { photoUploadUrl, applyOwnPhoto } from "@/app/admin/actions";

/** Shrinks a photo to at most 2400 px on the long side and re-encodes it as JPEG in the browser. */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.9));
}

/** Upload your own photo, as the main photo or as an extra photo in the article. */
export function PhotoUpload({ storyId, target, label }: { storyId: number; target: "main" | "gallery"; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState("error");
      setError("تەنها وێنە (JPG، PNG، WebP).");
      return;
    }
    setState("busy");
    try {
      const blob = await prepare(file);
      const { path, url } = await photoUploadUrl(storyId, "jpg");
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "image/jpeg", "x-upsert": "true" }, body: blob });
      if (!res.ok) throw new Error(`upload ${res.status}`);
      const form = new FormData();
      form.set("id", String(storyId));
      form.set("path", path);
      form.set("target", target);
      await applyOwnPhoto(form);
      setState("done");
    } catch (e) {
      setState("error");
      setError(`بارکردن سەرنەکەوت (${e instanceof Error ? e.message : "?"}). دووبارە هەوڵ بدەوە.`);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="upload">
      <label className={state === "busy" ? "btn small busy" : "btn small"}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(e.target.files?.[0])} disabled={state === "busy"} />
        {state === "busy" ? "بار دەکرێت…" : label}
      </label>
      {state === "done" ? <span className="upload-ok">زیادکرا ✓</span> : null}
      {state === "error" ? <span className="upload-err">{error}</span> : null}
    </div>
  );
}
