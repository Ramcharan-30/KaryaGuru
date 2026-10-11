"use client";

import React from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

export default function ExcalidrawWrapper() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0a0c14] rounded-b-xl border-t border-[#1b1f2e]">
      <Excalidraw
        theme="dark"
        initialData={{
          appState: {
            viewBackgroundColor: "#0a0c14",
            theme: "dark",
            currentItemFontFamily: 1,
            gridSize: 20,
          },
        }}
      />
    </div>
  );
}
