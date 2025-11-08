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
import { MessageCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SUPPORT_CATEGORIES = [
  "Why is my account banned?",
  "My account was banned for no reason",
  "Why was money deducted from my wallet?",
  "Order issue",
  "Payment problem",
  "Product inquiry",
  "Other issue"
];

export default function Support() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [aiSuggestion, setAiSuggestion] = useState("");

  useEffect(() => {
    checkAuth();
    fetchMyTickets();
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <MessageCircle className="h-8 w-8" />
            Customer Support
          </h1>
          <p className="text-muted-foreground mb-8">We're here to help you</p>

          <div className="grid gap-8">
            <Card>
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
                  <CardTitle>My Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myTickets.map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{ticket.subject}</p>
                            <p className="text-sm text-muted-foreground">{ticket.category}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            ticket.status === 'open' ? 'bg-yellow-500/20 text-yellow-700' :
                            ticket.status === 'closed' ? 'bg-green-500/20 text-green-700' :
                            'bg-blue-500/20 text-blue-700'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{ticket.message}</p>
                        {ticket.admin_response && (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="text-xs font-medium mb-1">Admin Response:</p>
                            <p className="text-sm">{ticket.admin_response}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
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
