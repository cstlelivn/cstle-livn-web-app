import { useState } from "react";
import { Users, Shield, Bell, Building2, Key, FolderKanban, Plus, GripVertical, X, Tag, Rocket, Copy, ExternalLink, CheckCircle, Settings2, Trash2, TestTube } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { useAuth } from "./AuthContext";
import { useApp } from "./AppContext";
import { toast } from "sonner";
import PhaseTemplateManager from "./PhaseTemplateManager";
import QAChecklist from "./QAChecklist";

// Default project phases for Cstle Livn
const DEFAULT_PHASES = [
  "Planning",
  "Prepping",
  "Production",
  "Finishing",
  "Final Inspection",
  "Delivered/Completed",
];

export default function SettingsModule() {
  const { hasPermission, user } = useAuth();
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 
          style={{ 
            fontFamily: 'var(--font-family-heading)', 
            fontVariationSettings: "'wdth' 137",
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            marginBottom: 'var(--spacing-2)'
          }}
        >
          Settings
        </h1>
        <p 
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--foreground-70)'
          }}
        >
          Manage phase templates and QA checklists
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList 
          style={{ 
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <TabsTrigger value="templates">
            <FolderKanban className="w-4 h-4 mr-2" />
            Phase Templates
          </TabsTrigger>
          <TabsTrigger value="checklists">
            <CheckCircle className="w-4 h-4 mr-2" />
            QA Checklists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <div className="p-6">
              <PhaseTemplateManager />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="mt-6">
          <Card>
            <div className="p-6">
              <QAChecklist />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}