import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";

interface ClientError { id: string; message: string; url: string | null; created_at: string }

export default function ClientErrorsCard() {
  const [errors, setErrors] = useState<ClientError[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("client_errors").select("id, message, url, created_at")
      .order("created_at", { ascending: false }).limit(15);
    setErrors((data as ClientError[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clear = async () => {
    await supabase.from("client_errors").delete().in("id", errors.map((e) => e.id));
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5 text-primary" /> App errors</CardTitle>
        <CardDescription>Latest crashes reported by merchant devices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {errors.length === 0 && <p className="text-sm text-muted-foreground">No errors reported.</p>}
        {errors.map((e) => (
          <div key={e.id} className="rounded border p-2 text-xs">
            <div className="break-all">{e.message}</div>
            <div className="text-muted-foreground">{e.url} · {new Date(e.created_at).toLocaleString()}</div>
          </div>
        ))}
        {errors.length > 0 && <Button size="sm" variant="outline" onClick={clear}>Clear shown</Button>}
      </CardContent>
    </Card>
  );
}
