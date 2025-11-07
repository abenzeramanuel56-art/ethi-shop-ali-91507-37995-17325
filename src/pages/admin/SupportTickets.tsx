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
import { MessageCircle } from "lucide-react";

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
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");

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
  };

  const handleRespond = async (ticketId: string) => {
    if (!response || !newStatus) {
      toast({
        title: "Error",
        description: "Please provide a response and select a status",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("support_tickets")
      .update({
        admin_response: response,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", ticketId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Ticket updated successfully"
    });

    setSelectedTicket(null);
    setResponse("");
    setNewStatus("");
    fetchTickets();
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
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
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
              <Card key={ticket.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{ticket.subject}</span>
                    <span className={`text-sm px-3 py-1 rounded ${
                      ticket.status === 'open' ? 'bg-yellow-500/20 text-yellow-700' :
                      ticket.status === 'closed' ? 'bg-green-500/20 text-green-700' :
                      'bg-blue-500/20 text-blue-700'
                    }`}>
                      {ticket.status.toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <p className="text-sm">{ticket.category}</p>
                    </div>
                    <div>
                      <Label>User ID</Label>
                      <p className="text-sm font-mono">{ticket.user_id}</p>
                    </div>
                    <div>
                      <Label>Message</Label>
                      <p className="text-sm">{ticket.message}</p>
                    </div>
                    <div>
                      <Label>Submitted</Label>
                      <p className="text-sm">{new Date(ticket.created_at).toLocaleString()}</p>
                    </div>

                    {ticket.admin_response && (
                      <div className="p-3 bg-muted rounded">
                        <Label>Your Response</Label>
                        <p className="text-sm">{ticket.admin_response}</p>
                      </div>
                    )}

                    {selectedTicket === ticket.id ? (
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <Label>Response</Label>
                          <Textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="Write your response..."
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleRespond(ticket.id)}>
                            Send Response
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedTicket(null);
                              setResponse("");
                              setNewStatus("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedTicket(ticket.id);
                          setResponse(ticket.admin_response || "");
                          setNewStatus(ticket.status);
                        }}
                        variant="default"
                      >
                        {ticket.admin_response ? "Update Response" : "Respond to Ticket"}
                      </Button>
                    )}
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
