"use client";

import { useRef, useState } from "react";
import { CloudUpload } from "lucide-react";

interface VideoDropzoneProps {
  file: File | null;
  onPick: (file: File | undefined) => void;
}

/** Click or drag-and-drop area for choosing one video file. */
export function VideoDropzone({ file, onPick }: VideoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onPick(e.dataTransfer.files?.[0]);
      }}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
        dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
      }`}
    >
      <CloudUpload size={40} className="text-primary mb-3" />
      {file ? (
        <>
          <p className="text-sm font-medium mb-1">{file.name}</p>
          <p className="text-xs text-muted">
            {(file.size / (1024 * 1024)).toFixed(1)} MB — click to change
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium mb-1">Drag &amp; drop your video here</p>
          <p className="text-xs text-muted">or click to browse your device</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          // Clear it so choosing the same file again still fires.
          e.target.value = "";
        }}
      />
    </div>
  );
}
