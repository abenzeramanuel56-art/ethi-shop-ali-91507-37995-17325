import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export async function startChatWithSeller(sellerId: string, subject?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { needsAuth: true as const };
  if (session.user.id === sellerId) return { error: "This is your own product" };
  const db = supabase as any;
  const { data: existing } = await db.from("chat_conversations").select("id")
    .eq("buyer_id", session.user.id).eq("seller_id", sellerId).maybeSingle();
  if (existing) return { id: existing.id as string };
  const { data, error } = await db.from("chat_conversations")
    .insert({ buyer_id: session.user.id, seller_id: sellerId, subject }).select("id").single();
  if (error) return { error: error.message };
  return { id: data.id as string };
}

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const db = supabase as any;
  const [me, setMe] = useState<string | null>(null);
  const [convos, setConvos] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate(`/auth?returnTo=/messages`); return; }
      setMe(session.user.id);
      const { data } = await db.from("chat_conversations").select("*").order("last_message_at", { ascending: false });
      setConvos(data || []);
      const ids = Array.from(new Set((data || []).flatMap((c: any) => [c.buyer_id, c.seller_id])));
      if (ids.length) {
        const { data: profs } = await db.from("profiles").select("id, full_name").in("id", ids);
        const m: Record<string, string> = {};
        (profs || []).forEach((p: any) => { m[p.id] = p.full_name || "User"; });
        setNames(m);
      }
      setLoading(false);
    })();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) { setMsgs([]); return; }
    db.from("chat_messages").select("*").eq("conversation_id", conversationId)
      .order("created_at").then(({ data }: any) => setMsgs(data || []));
    const ch = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (p: any) => setMsgs((prev) => prev.some((m) => m.id === p.new.id) ? prev : [...prev, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !conversationId || !me) return;
    setText("");
    const { data, error } = await db.from("chat_messages").insert({ conversation_id: conversationId, sender_id: me, body }).select().single();
    if (error) { toast.error(error.message); setText(body); return; }
    setMsgs((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]);
  };

  const active = convos.find((c) => c.id === conversationId);
  const otherName = (c: any) => names[c.buyer_id === me ? c.seller_id : c.buyer_id] || "User";
  const role = (c: any) => (c.buyer_id === me ? "Seller" : "Buyer");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <h1 className="text-2xl font-black mb-4 flex items-center gap-2"><MessageCircle className="h-6 w-6 text-primary" /> Messages</h1>
        {loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> : (
          <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[70vh]">
            <Card className={`tech-card overflow-y-auto ${conversationId ? "hidden md:block" : ""}`}>
              {convos.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No conversations yet. Use "Chat with seller" on any product.</p> :
                convos.map((c) => (
                  <Link key={c.id} to={`/messages/${c.id}`} className={`block p-3 border-b border-border/50 hover:bg-muted/50 ${c.id === conversationId ? "bg-primary/10" : ""}`}>
                    <div className="font-semibold text-sm">{otherName(c)} <span className="text-xs text-muted-foreground">· {role(c)}</span></div>
                    {c.subject && <div className="text-xs text-muted-foreground truncate">{c.subject}</div>}
                  </Link>
                ))}
            </Card>
            <Card className={`tech-card flex flex-col ${conversationId ? "" : "hidden md:flex"}`}>
              {!active ? <div className="m-auto text-sm text-muted-foreground">Select a conversation</div> : (
                <>
                  <div className="p-3 border-b border-border/50 flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="md:hidden" onClick={() => navigate("/messages")}><ArrowLeft className="h-4 w-4" /></Button>
                    <div>
                      <div className="font-bold">{otherName(active)}</div>
                      {active.subject && <div className="text-xs text-muted-foreground">{active.subject}</div>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {msgs.map((m) => (
                      <div key={m.id} className={`flex ${m.sender_id === me ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${m.sender_id === me ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {m.body}
                          <div className="text-[10px] opacity-60 mt-0.5">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                  <form onSubmit={send} className="p-3 border-t border-border/50 flex gap-2">
                    <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." maxLength={2000} />
                    <Button type="submit" size="icon" className="btn-glow"><Send className="h-4 w-4" /></Button>
                  </form>
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
