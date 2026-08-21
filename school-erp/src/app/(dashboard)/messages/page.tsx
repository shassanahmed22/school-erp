"use client";

import { useState } from "react";
import { Inbox, Send, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageList } from "./message-list";
import { ComposeMessageDialog } from "./compose-message-dialog";

export default function MessagesPage() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Send and receive messages with other staff, teachers, students, and parents on the portal."
        actions={<Button onClick={() => setComposeOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Compose</Button>}
      />

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox"><Inbox className="mr-1.5 h-4 w-4" /> Inbox</TabsTrigger>
          <TabsTrigger value="sent"><Send className="mr-1.5 h-4 w-4" /> Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox"><MessageList box="inbox" refreshKey={refreshKey} onChanged={bump} /></TabsContent>
        <TabsContent value="sent"><MessageList box="sent" refreshKey={refreshKey} onChanged={bump} /></TabsContent>
      </Tabs>

      <ComposeMessageDialog open={composeOpen} onOpenChange={setComposeOpen} onSent={bump} />
    </div>
  );
}
