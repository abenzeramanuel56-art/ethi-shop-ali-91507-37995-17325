import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Forward, Loader2, User, X, MessageCircle, Trash2, Paperclip, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string; image_url?: string | null };

const STORAGE_KEY = "abeni-agent-chat-v1";
const GREETING: Msg = {
  role: "assistant",
  content: "👋 Selam! I'm the Abeni Express Agent. Ask me anything about orders, payments, delivery, sellers, drivers, refunds, or digital products. You can also attach a screenshot. If I can't solve it, I can forward our chat to a human admin.",
};

function loadMessages(): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [GREETING];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return [GREETING];
}

export function FloatingAbeniAgent() {
  const { toast } = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [comingSoon, setComingSoon] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Detect coming-soon mode by reading the same setting MaintenanceWrapper uses
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any).from("app_settings").select("value").eq("key", "maintenance").maybeSingle();
        const v = data?.value;
        setComingSoon(!!(v && (v.coming_soon || v.enabled || v.maintenance)));
      } catch { setComingSoon(false); }
    })();
  }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))); } catch {}
  }, [messages]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const send = async () => {
    const text = input.trim();
    if ((!text && !attachment) || loading) return;

    let imageUrl: string | null = null;
    if (attachment) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const folder = user?.id || "anon";
        const ext = attachment.name.split(".").pop() || "jpg";
        const path = `${folder}/agent-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, attachment);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("support-attachments").createSignedUrl(path, 60 * 60 * 24 * 7);
        imageUrl = signed?.signedUrl || null;
      } catch (e: any) {
        toast({ title: "Upload failed", description: e?.message || "Could not attach screenshot", variant: "destructive" });
      }
    }

    const userMsg: Msg = { role: "user", content: text || "(screenshot attached)", image_url: imageUrl };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setAttachment(null);
    setLoading(true);

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "user") return [...prev, { role: "assistant", content: acc }];
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/abeni-agent`;
      // Build messages — when an image is attached, use multimodal content array (Gemini compatible)
      const apiMessages = next.slice(-20).map((m) => {
        if (m.image_url && m.role === "user") {
          return {
            role: "user",
            content: [
              { type: "text", text: m.content },
              { type: "image_url", image_url: { url: m.image_url } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          page_context: { path: location.pathname, is_coming_soon: comingSoon },
        }),
      });
      if (resp.status === 429) { toast({ title: "Slow down", description: "Too many messages, please wait.", variant: "destructive" }); setLoading(false); return; }
      if (resp.status === 402) { toast({ title: "AI unavailable", description: "Agent credits exhausted.", variant: "destructive" }); setLoading(false); return; }
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
    if (!user) { toast({ title: "Sign in required", description: "Please sign in to forward to admin.", variant: "destructive" }); return; }
    const firstUser = messages.find((m) => m.role === "user")?.content?.slice(0, 80) || "Agent escalation";
    setForwarding(true);
    // Create the ticket (header) — full chat is stored as bubbles in ticket_replies for admin chat-style view
    const { data: ticket, error } = await (supabase as any).from("support_tickets").insert({
      user_id: user.id,
      category: "agent_forward",
      subject: `[Agent escalation] ${firstUser}`,
      message: "Conversation forwarded from Abeni Express Agent — see chat below.",
    }).select().single();
    if (error || !ticket) { setForwarding(false); toast({ title: "Could not forward", description: error?.message || "", variant: "destructive" }); return; }
    // Insert each chat message as a reply with sender_label so admin sees it as chat bubbles
    const replies = messages.map((m) => ({
      ticket_id: ticket.id,
      user_id: user.id,
      message: m.content,
      is_admin: false,
      sender_label: m.role === "user" ? "customer" : "agent",
      attachment_url: m.image_url || null,
    }));
    if (replies.length) await (supabase as any).from("ticket_replies").insert(replies);
    setForwarding(false);
    toast({ title: "Forwarded to admin", description: "An admin will reply in your support tickets." });
    setMessages((prev) => [...prev, { role: "assistant", content: "✅ I've forwarded our conversation to a human admin. You'll see their reply on the Support page under **My Tickets**." }]);
  };

  const clearChat = () => {
    setMessages([GREETING]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Abeni Express Agent"
          className="fixed bottom-4 right-4 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 transition-transform animate-pulse-glow"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success border-2 border-background" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-[60] w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-2rem))] rounded-2xl border-2 border-primary/30 bg-background shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">Abeni Express Agent</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                {comingSoon ? "Pre-launch mode" : "Online · talks like a human"}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={clearChat} title="Clear chat" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} title="Minimize" className="h-8 w-8"><X className="h-4 w-4" /></Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Bot className="h-4 w-4 text-primary" /></div>}
                <div className={`rounded-2xl px-3 py-2 text-sm max-w-[78%] whitespace-pre-wrap break-words ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                  {m.image_url && <img src={m.image_url} alt="screenshot" className="rounded-lg mb-2 max-h-40 object-cover" />}
                  {m.content || <span className="opacity-50">…</span>}
                </div>
                {m.role === "user" && <div className="h-7 w-7 rounded-full bg-secondary/30 flex items-center justify-center flex-shrink-0"><User className="h-4 w-4" /></div>}
              </div>
            ))}
            {loading && <div className="text-xs text-muted-foreground flex items-center gap-2 pl-9"><Loader2 className="h-3 w-3 animate-spin" /> typing…</div>}
          </div>

          <div className="border-t p-2 space-y-2 bg-background">
            {attachment && (
              <div className="flex items-center gap-2 text-xs bg-muted/40 rounded-lg p-2">
                <ImageIcon className="h-3 w-3" />
                <span className="flex-1 truncate">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="text-destructive"><X className="h-3 w-3" /></button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
              <Button type="button" size="icon" variant="outline" onClick={() => fileRef.current?.click()} title="Attach screenshot"><Paperclip className="h-4 w-4" /></Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={loading}
                className="text-sm"
              />
              <Button onClick={send} disabled={loading || (!input.trim() && !attachment)} size="icon"><Send className="h-4 w-4" /></Button>
            </div>
            <Button onClick={forwardToAdmin} variant="outline" size="sm" disabled={forwarding || messages.length < 2} className="w-full">
              {forwarding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Forward className="h-3 w-3 mr-1" />}
              Forward conversation to Admin
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
