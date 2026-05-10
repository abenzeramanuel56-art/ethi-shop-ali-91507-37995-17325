import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Forward, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

export function AbeniAgentChat({ onForwarded }: { onForwarded?: () => void }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "👋 Selam! I'm the Abeni Express Agent. I can help with orders, payments, deliveries, seller/driver applications, refunds, and digital products. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== messages[messages.length - 1]?.content) {
          // ok — but ensure we're updating the streaming reply
        }
        // If last is user, append assistant; else update last assistant
        if (last?.role === "user") return [...prev, { role: "assistant", content: acc }];
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abeni-agent`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      if (resp.status === 429) { toast({ title: "Slow down", description: "Too many messages, please wait a moment.", variant: "destructive" }); setLoading(false); return; }
      if (resp.status === 402) { toast({ title: "AI unavailable", description: "Agent credits exhausted. Please use the form below.", variant: "destructive" }); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("Agent unavailable");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) upsert(delta);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Agent error", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const forwardToAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Sign in required", description: "Please sign in to forward this chat.", variant: "destructive" }); return; }
    const transcript = messages.map((m) => `${m.role === "user" ? "Customer" : "Agent"}: ${m.content}`).join("\n\n");
    const firstUser = messages.find((m) => m.role === "user")?.content?.slice(0, 80) || "Agent escalation";
    setForwarding(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      category: "Other issue",
      subject: `[Agent escalation] ${firstUser}`,
      message: transcript,
    });
    setForwarding(false);
    if (error) { toast({ title: "Could not forward", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Forwarded to admin", description: "An admin will reply in your tickets list below." });
    setMessages((prev) => [...prev, { role: "assistant", content: "✅ I've forwarded our conversation to a human admin. You'll see their reply in **My Tickets** below." }]);
    onForwarded?.();
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Abeni Express Agent
          <span className="ml-auto text-xs font-normal text-muted-foreground">Live · talks like a human</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="h-80 overflow-y-auto rounded-lg bg-muted/30 p-3 space-y-3 mb-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Bot className="h-4 w-4 text-primary" /></div>}
              <div className={`rounded-2xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                {m.content || <span className="opacity-50">…</span>}
              </div>
              {m.role === "user" && <div className="h-7 w-7 rounded-full bg-secondary/30 flex items-center justify-center flex-shrink-0"><User className="h-4 w-4" /></div>}
            </div>
          ))}
          {loading && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Agent is typing…</div>}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the Abeni Express Agent…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
          <Button onClick={forwardToAdmin} variant="outline" disabled={forwarding || messages.length < 2} title="Forward this conversation to a human admin">
            {forwarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Forward className="h-4 w-4 mr-1" />}
            Forward to Admin
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Tip: ask anything about orders, payments, delivery, sellers, drivers, refunds, or digital products.</p>
      </CardContent>
    </Card>
  );
}
