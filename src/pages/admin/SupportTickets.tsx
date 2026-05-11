import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface TicketReply {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  sender_label?: string | null;
  attachment_url?: string | null;
}

interface Ticket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

export default function AdminSupportTickets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<Record<string, string>>({});
  const [ticketReplies, setTicketReplies] = useState<Record<string, TicketReply[]>>({});
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({});
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdmin();
    fetchTickets();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "admin")) {
      navigate("/");
      return;
    }
  };

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    setTickets(data || []);
    setLoading(false);

    // Fetch replies for all tickets
    if (data) {
      data.forEach(ticket => fetchTicketReplies(ticket.id));
    }
  };

  const fetchTicketReplies = async (ticketId: string) => {
    const { data } = await supabase
      .from("ticket_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (data) {
      setTicketReplies(prev => ({ ...prev, [ticketId]: data }));
    }
  };

  const handleSendReply = async (ticketId: string) => {
    const replyMessage = replyMessages[ticketId];
    if (!replyMessage?.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("ticket_replies")
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: replyMessage,
        is_admin: true
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Reply sent",
      description: "Your response has been sent to the customer"
    });

    setReplyMessages(prev => ({ ...prev, [ticketId]: "" }));
    fetchTicketReplies(ticketId);
  };

  const handleUpdateStatus = async (ticketId: string) => {
    const status = newStatus[ticketId];
    if (!status) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket status updated"
    });

    fetchTickets();
  };

  const toggleTicket = (ticketId: string) => {
    setExpandedTickets(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2 text-primary">
          <MessageCircle className="h-8 w-8" />
          Support Tickets
        </h1>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">No support tickets</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="border-2">
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleTicket(ticket.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{ticket.subject}</span>
                      <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                        ticket.status === 'open' ? 'bg-warning/20 text-warning' :
                        ticket.status === 'closed' ? 'bg-success/20 text-success' :
                        'bg-info/20 text-info'
                      }`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                </div>

                {expandedTickets.has(ticket.id) && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Category</Label>
                          <p className="text-sm">{ticket.category}</p>
                        </div>
                        <div>
                          <Label>User ID</Label>
                          <p className="text-sm font-mono">{ticket.user_id}</p>
                        </div>
                      </div>
                      
                      <div>
                        <Label>Original Message</Label>
                        <p className="text-sm text-muted-foreground">{ticket.message}</p>
                      </div>

                      <div>
                        <Label>Submitted</Label>
                        <p className="text-sm">{new Date(ticket.created_at).toLocaleString()}</p>
                      </div>

                      <Separator />

                      {/* Conversation Thread — chat bubbles for agent forwards */}
                      {ticket.category === "agent_forward" && (
                        <div className="text-xs px-2 py-1 rounded bg-primary/10 text-primary inline-block mb-2">
                          📩 Forwarded from Abeni Express Agent
                        </div>
                      )}
                      <div className="space-y-3 max-h-[500px] overflow-y-auto bg-muted/20 rounded-lg p-3">
                        {ticketReplies[ticket.id]?.map((reply) => {
                          const role = reply.is_admin ? "admin" : (reply.sender_label || "customer");
                          const align = role === "customer" ? "justify-start" : "justify-end";
                          const bubble =
                            role === "admin" ? "bg-primary text-primary-foreground" :
                            role === "agent" ? "bg-accent/30 border border-accent" :
                            "bg-background border";
                          const label = role === "admin" ? "Admin (you)" : role === "agent" ? "Abeni Agent" : "Customer";
                          return (
                            <div key={reply.id} className={`flex ${align}`}>
                              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${bubble}`}>
                                <div className="text-[10px] uppercase tracking-wide opacity-70 mb-1">{label} · {new Date(reply.created_at).toLocaleTimeString()}</div>
                                {reply.attachment_url && (
                                  <a href={reply.attachment_url} target="_blank" rel="noreferrer">
                                    <img src={reply.attachment_url} alt="attachment" className="rounded mb-2 max-h-48 object-cover" />
                                  </a>
                                )}
                                <p className="whitespace-pre-wrap break-words">{reply.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Admin Reply Input */}
                      {ticket.status !== 'closed' && (
                        <div className="space-y-4 pt-4 border-t">
                          <div>
                            <Label>Send Reply</Label>
                            <div className="flex gap-2">
                              <Textarea
                                value={replyMessages[ticket.id] || ""}
                                onChange={(e) =>
                                  setReplyMessages(prev => ({
                                    ...prev,
                                    [ticket.id]: e.target.value
                                  }))
                                }
                                placeholder="Type your response to the customer..."
                                rows={4}
                                className="flex-1"
                              />
                              <Button
                                onClick={() => handleSendReply(ticket.id)}
                                disabled={!replyMessages[ticket.id]?.trim()}
                                size="icon"
                                className="h-auto"
                              >
                                <Send className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>

                          <div>
                            <Label>Update Status</Label>
                            <div className="flex gap-2">
                              <Select 
                                value={newStatus[ticket.id] || ticket.status} 
                                onValueChange={(value) => 
                                  setNewStatus(prev => ({ ...prev, [ticket.id]: value }))
                                }
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button onClick={() => handleUpdateStatus(ticket.id)}>
                                Update
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
