import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { provinceTh, REGION_LABEL } from "@/lib/i18n";
import type { Submission } from "@/lib/types";

export const Route = createFileRoute("/admin/submissions")({
  component: AdminSubmissions;
});

function AdminSubmissions() {
  return null;
}
