"use client";

import { useEffect, useState } from "react";
import { School, Cog, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { SessionsTab } from "@/components/shared/sessions-tab";
import { useThemeStore } from "@/store/theme-store";
import { useLanguageStore } from "@/store/language-store";
import { usePermission } from "@/hooks/use-permission";

type SettingsGroups = {
  school?: Record<string, string>;
  system?: Record<string, string>;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsGroups>({});
  const [loading, setLoading] = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const { locale, setLocale } = useLanguageStore();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => setSettings(j.data ?? {}))
      .finally(() => setLoading(false));
  }, []);

  async function saveGroup(group: "school" | "system", values: Record<string, string>, setSaving: (b: boolean) => void) {
    setSaving(true);
    try {
      const payload = {
        settings: Object.entries(values).map(([key, value]) => ({ key: `${group}.${key}`, value })),
      };
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to save settings", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Settings saved", variant: "success" });
    } finally {
      setSaving(false);
    }
  }

  const canManageSettings = usePermission("settings.manage");

  return (
    <div>
      <PageHeader title="Settings" description="Manage school profile, system defaults, and your account security." />

      <Tabs defaultValue={canManageSettings ? "school" : "security"}>
        <TabsList>
          {canManageSettings && <TabsTrigger value="school"><School className="mr-1.5 h-4 w-4" /> School</TabsTrigger>}
          {canManageSettings && <TabsTrigger value="system"><Cog className="mr-1.5 h-4 w-4" /> System</TabsTrigger>}
          <TabsTrigger value="security"><KeyRound className="mr-1.5 h-4 w-4" /> Security</TabsTrigger>
        </TabsList>

        {canManageSettings && (
        <>
        <TabsContent value="school">
          <Card>
            <CardHeader>
              <CardTitle>School Settings</CardTitle>
              <CardDescription>Basic information about your institution, used across the ERP.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <SchoolSettingsForm
                  initial={settings.school ?? {}}
                  saving={savingSchool}
                  onSave={(v) => saveGroup("school", v, setSavingSchool)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Defaults applied across the platform for all users.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <SystemSettingsForm
                  initial={settings.system ?? {}}
                  saving={savingSystem}
                  onSave={(v) => {
                    saveGroup("system", v, setSavingSystem);
                    if (v.default_theme) setTheme(v.default_theme as "light" | "dark");
                    if (v.default_language) setLocale(v.default_language as "en" | "ur");
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </>
        )}

        <TabsContent value="security">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password. You&apos;ll stay signed in on this device.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Devices currently signed in to your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <SessionsTab />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SchoolSettingsForm({
  initial, saving, onSave,
}: { initial: Record<string, string>; saving: boolean; onSave: (v: Record<string, string>) => void }) {
  const [values, setValues] = useState({
    name: initial.name ?? "",
    logo: initial.logo ?? "",
    address: initial.address ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
  });

  return (
    <form
      className="space-y-4 max-w-lg"
      onSubmit={(e) => { e.preventDefault(); onSave(values); }}
    >
      <div className="space-y-1.5">
        <Label>School Name</Label>
        <Input value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>School Logo URL</Label>
        <Input value={values.logo} onChange={(e) => setValues((v) => ({ ...v, logo: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>School Address</Label>
        <Input value={values.address} onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>School Phone</Label>
          <Input value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>School Email</Label>
          <Input value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
        </div>
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
    </form>
  );
}

function SystemSettingsForm({
  initial, saving, onSave,
}: { initial: Record<string, string>; saving: boolean; onSave: (v: Record<string, string>) => void }) {
  const [values, setValues] = useState({
    default_language: initial.default_language ?? "en",
    default_theme: initial.default_theme ?? "light",
    timezone: initial.timezone ?? "Asia/Karachi",
    date_format: initial.date_format ?? "DD/MM/YYYY",
  });

  return (
    <form
      className="space-y-4 max-w-lg"
      onSubmit={(e) => { e.preventDefault(); onSave(values); }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Default Language</Label>
          <Select value={values.default_language} onValueChange={(v) => setValues((s) => ({ ...s, default_language: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ur">اردو (Urdu)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default Theme</Label>
          <Select value={values.default_theme} onValueChange={(v) => setValues((s) => ({ ...s, default_theme: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Timezone</Label>
        <Input value={values.timezone} onChange={(e) => setValues((v) => ({ ...v, timezone: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Date Format</Label>
        <Select value={values.date_format} onValueChange={(v) => setValues((s) => ({ ...s, date_format: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
    </form>
  );
}
