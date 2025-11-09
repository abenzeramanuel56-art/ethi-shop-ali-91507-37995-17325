import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Sparkles, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const SUPPORT_CATEGORIES = [
  "Why is my account banned?",
  "My account was banned for no reason",
  "Why was money deducted from my wallet?",
  "Order issue",
  "Payment problem",
  "Product inquiry",
  "Other issue"
];

interface TicketReply {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

export default function Support() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [ticketReplies, setTicketReplies] = useState<Record<string, TicketReply[]>>({});
  const [replyMessages, setReplyMessages] = useState<Record<string, string>>({});
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
    fetchMyTickets();

    // Set up real-time subscription for ticket replies
    const channel = supabase
      .channel('ticket-replies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_replies'
        },
        (payload) => {
          console.log('New reply received:', payload);
          // Refetch replies for the affected ticket
          const ticketId = (payload.new as any).ticket_id;
          if (ticketId) {
            fetchTicketReplies(ticketId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const fetchMyTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setMyTickets(data || []);
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to submit a support ticket",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!category || !subject || !message) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Submit ticket
    const { error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        category,
        subject,
        message
      });

    if (error) {
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to submit ticket. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Get AI suggestion
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        "analyze-support-ticket",
        {
          body: { category, subject, message }
        }
      );

      if (aiError) {
        console.error("AI analysis error:", aiError);
      } else if (aiData?.suggestion) {
        setAiSuggestion(aiData.suggestion);
      }
    } catch (aiError) {
      console.error("Failed to get AI suggestion:", aiError);
    }

    setLoading(false);

    toast({
      title: "Ticket submitted",
      description: "Our support team will respond soon"
    });

    setCategory("");
    setSubject("");
    setMessage("");
    fetchMyTickets();
  };

  const handleSendReply = async (ticketId: string) => {
    const replyMessage = replyMessages[ticketId];
    if (!replyMessage?.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("ticket_replies")
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: replyMessage,
        is_admin: false
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
      description: "Your message has been sent to support"
    });

    setReplyMessages(prev => ({ ...prev, [ticketId]: "" }));
    fetchTicketReplies(ticketId);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-primary">
            <MessageCircle className="h-8 w-8" />
            Customer Support
          </h1>
          <p className="text-muted-foreground mb-8">We're here to help you</p>

          <div className="grid gap-8">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Your User ID</Label>
                    <Input value={userId} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is automatically filled when you're signed in
                    </p>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      required
                    />
                  </div>

                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please provide details about your issue..."
                      rows={6}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {aiSuggestion && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI-Suggested Solution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertDescription className="whitespace-pre-wrap">
                      {aiSuggestion}
                    </AlertDescription>
                  </Alert>
                  <p className="text-xs text-muted-foreground mt-3">
                    This is an automated suggestion. Our support team will review your ticket and provide additional assistance if needed.
                  </p>
                </CardContent>
              </Card>
            )}

            {myTickets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>My Support Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myTickets.map((ticket) => (
                      <div key={ticket.id} className="border-2 rounded-lg overflow-hidden">
                        <div 
                          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleTicket(ticket.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-lg">{ticket.subject}</p>
                              <p className="text-sm text-muted-foreground">{ticket.category}</p>
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              ticket.status === 'open' ? 'bg-warning/20 text-warning' :
                              ticket.status === 'closed' ? 'bg-success/20 text-success' :
                              'bg-info/20 text-info'
                            }`}>
                              {ticket.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleString()}
                          </p>
                        </div>

                        {expandedTickets.has(ticket.id) && (
                          <div className="border-t bg-muted/30">
                            <div className="p-4 space-y-4">
                              <div>
                                <p className="text-sm font-medium mb-1">Original Message:</p>
                                <p className="text-sm text-muted-foreground">{ticket.message}</p>
                              </div>

                              <Separator />

                              {/* Conversation Thread */}
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {ticketReplies[ticket.id]?.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className={`p-3 rounded-lg ${
                                      reply.is_admin
                                        ? "bg-primary/10 ml-4 border-l-4 border-primary"
                                        : "bg-secondary/10 mr-4 border-l-4 border-secondary"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-semibold">
                                        {reply.is_admin ? "Support Team" : "You"}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(reply.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm">{reply.message}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Reply Input */}
                              {ticket.status !== 'closed' && (
                                <div className="flex gap-2 pt-2">
                                  <Textarea
                                    value={replyMessages[ticket.id] || ""}
                                    onChange={(e) =>
                                      setReplyMessages(prev => ({
                                        ...prev,
                                        [ticket.id]: e.target.value
                                      }))
                                    }
                                    placeholder="Type your reply..."
                                    rows={3}
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
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
