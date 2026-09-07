import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Bot, Power, PowerOff, Trash2, Send } from "lucide-react";

interface Instruction {
  id: string;
  instruction: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminAgentConsole() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<Instruction[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) { navigate("/"); return; }
    fetchAll();
  })(); }, []);

  const fetchAll = async () => {
    const { data } = await (supabase as any).from("agent_instructions").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("agent_instructions").insert({ admin_id: user!.id, instruction: text });
    setSending(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setDraft("");
    toast({ title: "Sent to agent", description: "The Abeni Agent will use this on its next reply." });
    fetchAll();
  };

  const toggle = async (it: Instruction) => {
    await (supabase as any).from("agent_instructions").update({ is_active: !it.is_active }).eq("id", it.id);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this instruction permanently?")) return;
    await (supabase as any).from("agent_instructions").delete().eq("id", id);
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-primary">
          <Bot className="h-8 w-8" /> Agent Console
        </h1>
        <p className="text-muted-foreground mb-6">
          Tell the Abeni Express Agent about app updates, new rules, or fresh facts. The agent will use every <strong>active</strong> instruction in every customer chat.
        </p>

        <Card className="mb-6 border-2 border-primary/30">
          <CardHeader><CardTitle className="text-base">New instruction</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder='e.g. "From today, refunds take up to 48 hours. Dashen Bank is now supported for withdrawals."'
            />
            <Button onClick={submit} disabled={sending || !draft.trim()} className="w-full">
              <Send className="h-4 w-4 mr-2" /> Send to Agent
            </Button>
          </CardContent>
        </Card>

        <h2 className="font-bold text-lg mb-3">Active & past instructions</h2>
        {loading ? <p className="text-muted-foreground">Loading…</p> : items.length === 0 ? (
          <Card><CardContent className="pt-6"><p className="text-muted-foreground text-center">No instructions yet. The agent runs on its base knowledge only.</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <Card key={it.id} className={it.is_active ? "border-success/40" : "opacity-60"}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">{it.instruction}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(it.created_at).toLocaleString()} · {it.is_active ? "Active — agent uses this" : "Disabled"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => toggle(it)}>
                        {it.is_active ? <><PowerOff className="h-3 w-3 mr-1" />Disable</> : <><Power className="h-3 w-3 mr-1" />Enable</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(it.id)} className="text-destructive">
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
