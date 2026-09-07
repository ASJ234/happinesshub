"use client";

import { CloudUpload } from "lucide-react";

export function UploadWidget() {
  return (
    <div className="bg-surface border-2 border-dashed border-primary/40 rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

      <div className="relative">
        <h2 className="text-lg font-semibold mb-1">Upload Your Video</h2>
        <p className="text-sm text-muted mb-6">
          Share your video with the world in just a few clicks — MP4, MOV up to 10GB
        </p>

        <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center mb-4 hover:border-primary/50 transition-colors cursor-pointer">
          <CloudUpload size={40} className="text-primary mb-3" />
          <p className="text-sm font-medium mb-1">Drag & drop your video here</p>
          <p className="text-xs text-muted">or click to browse files from your device</p>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 bg-white text-gray-900 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-100 transition-colors">
            Select File
          </button>
          <button className="flex-1 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors">
            Import from Google Drive
          </button>
        </div>
      </div>
    </div>
  );
}
