import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Users, ArrowRight } from "lucide-react";

interface TaskRoutingProps {
  clinicId: string;
  locationId: string;
}

interface RoutingRule {
  id: string;
  rule_name: string;
  assignment_type: string;
  priority_filter: string;
  source_filter: string;
  assigned_user_ids: string[];
  is_active: boolean;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

export const TaskRouting = ({ clinicId, locationId }: TaskRoutingProps) => {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Partial<RoutingRule> | null>(null);

  useEffect(() => {
    loadRules();
    loadTeamMembers();
  }, [locationId]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from("task_routing_rules")
        .select("*")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error("Error loading routing rules:", error);
      toast.error("Failed to load routing rules");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("clinic_users")
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq("clinic_id", clinicId);

      if (error) throw error;
      
      const members = data
        ?.map((item: any) => item.profiles)
        .filter((profile: any) => profile !== null);
      
      setTeamMembers(members || []);
    } catch (error) {
      console.error("Error loading team members:", error);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule?.rule_name || !editingRule?.assignment_type) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      if (editingRule.id) {
        const { error } = await supabase
          .from("task_routing_rules")
          .update({
            rule_name: editingRule.rule_name,
            assignment_type: editingRule.assignment_type,
            priority_filter: editingRule.priority_filter,
            source_filter: editingRule.source_filter,
            assigned_user_ids: editingRule.assigned_user_ids,
            is_active: editingRule.is_active,
          })
          .eq("id", editingRule.id);

        if (error) throw error;
        toast.success("Rule updated successfully");
      } else {
        const { error } = await supabase
          .from("task_routing_rules")
          .insert({
            location_id: locationId,
            rule_name: editingRule.rule_name,
            assignment_type: editingRule.assignment_type,
            priority_filter: editingRule.priority_filter || "all",
            source_filter: editingRule.source_filter,
            assigned_user_ids: editingRule.assigned_user_ids || [],
            is_active: editingRule.is_active ?? true,
          });

        if (error) throw error;
        toast.success("Rule created successfully");
      }

      setEditingRule(null);
      loadRules();
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save rule");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("task_routing_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;
      toast.success("Rule deleted successfully");
      loadRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const toggleRuleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("task_routing_rules")
        .update({ is_active: !currentStatus })
        .eq("id", ruleId);

      if (error) throw error;
      toast.success(`Rule ${!currentStatus ? "activated" : "deactivated"}`);
      loadRules();
    } catch (error) {
      console.error("Error toggling rule status:", error);
      toast.error("Failed to update rule status");
    }
  };

  const getAssignmentTypeLabel = (type: string) => {
    switch (type) {
      case "round_robin": return "Round Robin";
      case "specific_user": return "Specific User";
      case "by_priority": return "By Priority";
      case "by_source": return "By Source";
      case "manual": return "Manual Assignment";
      default: return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading routing rules...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Task Routing Rules</CardTitle>
              <CardDescription>
                Automatically assign tasks to team members based on rules
              </CardDescription>
            </div>
            <Button onClick={() => setEditingRule({ is_active: true })}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No routing rules configured yet</p>
              <p className="text-sm">Create your first rule to automate task assignment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{rule.rule_name}</h4>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        {getAssignmentTypeLabel(rule.assignment_type)}
                      </span>
                      {rule.priority_filter && rule.priority_filter !== "all" && (
                        <Badge variant="outline" className="text-xs">
                          Priority: {rule.priority_filter}
                        </Badge>
                      )}
                      {rule.source_filter && (
                        <Badge variant="outline" className="text-xs">
                          Source: {rule.source_filter}
                        </Badge>
                      )}
                      {rule.assigned_user_ids && rule.assigned_user_ids.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {rule.assigned_user_ids.length} team member(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRuleStatus(rule.id, rule.is_active)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRule(rule)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Rule Dialog */}
      {editingRule && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>{editingRule.id ? "Edit Rule" : "Create New Rule"}</CardTitle>
            <CardDescription>
              Configure how tasks should be automatically assigned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ruleName">Rule Name *</Label>
              <Input
                id="ruleName"
                value={editingRule.rule_name || ""}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, rule_name: e.target.value })
                }
                placeholder="e.g., High Priority to Senior Staff"
              />
            </div>

            <div>
              <Label htmlFor="assignmentType">Assignment Type *</Label>
              <Select
                value={editingRule.assignment_type || ""}
                onValueChange={(value) =>
                  setEditingRule({ ...editingRule, assignment_type: value })
                }
              >
                <SelectTrigger id="assignmentType">
                  <SelectValue placeholder="Select assignment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Round Robin - Distribute evenly</SelectItem>
                  <SelectItem value="specific_user">Specific User - Assign to chosen team members</SelectItem>
                  <SelectItem value="by_priority">By Priority - Assign based on task priority</SelectItem>
                  <SelectItem value="by_source">By Source - Assign based on where task came from</SelectItem>
                  <SelectItem value="manual">Manual - Require manual assignment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priorityFilter">Priority Filter (optional)</Label>
              <Select
                value={editingRule.priority_filter || "all"}
                onValueChange={(value) =>
                  setEditingRule({ ...editingRule, priority_filter: value })
                }
              >
                <SelectTrigger id="priorityFilter">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority Only</SelectItem>
                  <SelectItem value="medium">Medium Priority Only</SelectItem>
                  <SelectItem value="low">Low Priority Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sourceFilter">Source Filter (optional)</Label>
              <Input
                id="sourceFilter"
                value={editingRule.source_filter || ""}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, source_filter: e.target.value })
                }
                placeholder="e.g., phone, sms, email"
              />
            </div>

            {editingRule.assignment_type === "specific_user" && (
              <div>
                <Label>Assign To Team Members</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingRule.assigned_user_ids?.includes(member.id)}
                        onChange={(e) => {
                          const currentIds = editingRule.assigned_user_ids || [];
                          const newIds = e.target.checked
                            ? [...currentIds, member.id]
                            : currentIds.filter((id) => id !== member.id);
                          setEditingRule({ ...editingRule, assigned_user_ids: newIds });
                        }}
                        className="rounded"
                      />
                      <Label className="cursor-pointer flex-1">
                        {member.full_name || member.email}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={editingRule.is_active ?? true}
                onCheckedChange={(checked) =>
                  setEditingRule({ ...editingRule, is_active: checked })
                }
              />
              <Label>Active</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveRule} className="flex-1">
                {editingRule.id ? "Update Rule" : "Create Rule"}
              </Button>
              <Button variant="outline" onClick={() => setEditingRule(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};