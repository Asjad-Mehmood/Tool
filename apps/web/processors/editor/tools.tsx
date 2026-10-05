"use client";
import type { ComponentType } from "react";
import PdfEditor from "@/components/editor/PdfEditor";

export const tools: Record<string, ComponentType> = { "pdf-editor": PdfEditor };
