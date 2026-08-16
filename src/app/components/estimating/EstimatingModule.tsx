import { useState } from "react";
import { useAuth } from "../AuthContext";
import LeadsListScreen from "./LeadsListScreen";
import EstimateWorkspace from "./EstimateWorkspace";
import ConfigScreen from "./ConfigScreen";

export default function EstimatingModule() {
  const { hasPermission } = useAuth();
  const canManageConfig = hasPermission("canManageEstimatingConfig");
  const [tab, setTab] = useState<"pipeline" | "config">("pipeline");
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null);

  return (
    <div className="space-y-[16px]">
      {canManageConfig && (
        <div className="flex items-center gap-[0px] border border-border rounded-[10px] p-[3px] w-fit bg-card">
          <button
            onClick={() => setTab("pipeline")}
            className={`px-[14px] py-[7px] rounded-[7px] font-['Roboto_Mono'] text-[11px] transition-colors ${tab === "pipeline" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/10"}`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setTab("config")}
            className={`px-[14px] py-[7px] rounded-[7px] font-['Roboto_Mono'] text-[11px] transition-colors ${tab === "config" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/10"}`}
          >
            Rate Card & Assemblies
          </button>
        </div>
      )}

      {tab === "config" ? (
        <ConfigScreen />
      ) : activeEstimateId ? (
        <EstimateWorkspace estimateId={activeEstimateId} onBack={() => setActiveEstimateId(null)} />
      ) : (
        <LeadsListScreen onOpen={setActiveEstimateId} />
      )}
    </div>
  );
}
