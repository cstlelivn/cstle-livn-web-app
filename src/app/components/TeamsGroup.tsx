import { useState, useEffect } from "react";
import { Users, Building2, DollarSign } from "lucide-react";
import TeamManagement from "./TeamManagementNew";
import VendorManagement from "./VendorManagement";
import PayrollSummary from "./PayrollSummary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from "./AuthContext";
import { useApp } from "./AppContext";

interface TeamsGroupProps {
  initialTab?: "team" | "vendors" | "payroll";
}

export default function TeamsGroup({ initialTab = "team" }: TeamsGroupProps) {
  const { hasPermission } = useAuth();
  const { teamMembers } = useApp();
  const canViewTeam = hasPermission("canViewTeam");
  const canViewVendors = hasPermission("canViewVendors");
  const canViewPayroll = hasPermission("admin") || hasPermission("manager");
  
  // Determine the default tab based on permissions
  const defaultTab = canViewTeam ? "team" : canViewVendors ? "vendors" : "payroll";
  const [activeTab, setActiveTab] = useState<"team" | "vendors" | "payroll">(initialTab || defaultTab);

  useEffect(() => {
    setActiveTab(initialTab || defaultTab);
  }, [initialTab, defaultTab]);

  // If user can only see one tab, show it directly without tabs
  if (canViewTeam && !canViewVendors && !canViewPayroll) {
    return <TeamManagement />;
  }
  
  if (canViewVendors && !canViewTeam && !canViewPayroll) {
    return <VendorManagement />;
  }

  if (canViewPayroll && !canViewTeam && !canViewVendors) {
    return <PayrollSummary teamMembers={teamMembers} />;
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "team" | "vendors" | "payroll")} className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border rounded-[12px] p-[4px] mb-[24px] h-auto">
          {canViewTeam && (
            <TabsTrigger 
              value="team" 
              className="flex items-center gap-[8px] px-[16px] py-[10px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[8px] transition-colors font-['Roboto_Mono'] text-[11px]"
            >
              <Users className="w-[14px] h-[14px]" />
              Team
            </TabsTrigger>
          )}
          {canViewVendors && (
            <TabsTrigger 
              value="vendors" 
              className="flex items-center gap-[8px] px-[16px] py-[10px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[8px] transition-colors font-['Roboto_Mono'] text-[11px]"
            >
              <Building2 className="w-[14px] h-[14px]" />
              Vendors
            </TabsTrigger>
          )}
          {canViewPayroll && (
            <TabsTrigger 
              value="payroll" 
              className="flex items-center gap-[8px] px-[16px] py-[10px] data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-[8px] transition-colors font-['Roboto_Mono'] text-[11px]"
            >
              <DollarSign className="w-[14px] h-[14px]" />
              Payroll
            </TabsTrigger>
          )}
        </TabsList>

        {canViewTeam && (
          <TabsContent value="team" className="mt-0">
            <TeamManagement />
          </TabsContent>
        )}

        {canViewVendors && (
          <TabsContent value="vendors" className="mt-0">
            <VendorManagement />
          </TabsContent>
        )}

        {canViewPayroll && (
          <TabsContent value="payroll" className="mt-0">
            <PayrollSummary teamMembers={teamMembers} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}