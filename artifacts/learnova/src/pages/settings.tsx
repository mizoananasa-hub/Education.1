import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTheme, setTheme } from "@/lib/theme";
import { loadSettings, saveSetting, type AppSettings } from "@/lib/settings-store";
import {
  User, Palette, Bell, Shield, BookOpen, GraduationCap,
  Sun, Moon, LogOut, Save, Lock, Check, ChevronRight,
} from "lucide-react";

type Section =
  | "account"
  | "appearance"
  | "notifications"
  | "privacy"
  | "learning"
  | "teacher-prefs";

interface NavItem {
  id: Section;
  label: string;
  icon: React.ElementType;
  roles: Array<"student" | "teacher">;
}

const NAV_ITEMS: NavItem[] = [
  { id: "account", label: "Account", icon: User, roles: ["student", "teacher"] },
  { id: "appearance", label: "Appearance", icon: Palette, roles: ["student", "teacher"] },
  { id: "notifications", label: "Notifications", icon: Bell, roles: ["student", "teacher"] },
  { id: "learning", label: "Learning Preferences", icon: BookOpen, roles: ["student"] },
  { id: "teacher-prefs", label: "Teacher Preferences", icon: GraduationCap, roles: ["teacher"] },
  { id: "privacy", label: "Privacy & Security", icon: Shield, roles: ["student", "teacher"] },
];

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1 pr-6">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("account");
  const [theme, setThemeState] = useState<"light" | "dark">(getTheme);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [saved, setSaved] = useState<Section | null>(null);

  const role = user?.role ?? "student";

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role as "student" | "teacher"));

  const handleThemeToggle = (dark: boolean) => {
    const next: "light" | "dark" = dark ? "dark" : "light";
    setTheme(next);
    setThemeState(next);
    toast({ title: `${next === "dark" ? "Dark" : "Light"} mode enabled` });
  };

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      saveSetting(key, value);
    },
    [],
  );

  const showSaved = (section: Section) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
    toast({ title: "Settings saved" });
  };

  const navClasses = (id: Section) =>
    cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group text-left",
      activeSection === id
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and appearance.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings nav */}
        <aside className="md:w-56 shrink-0">
          <nav className="space-y-1 sticky top-0">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                className={navClasses(item.id)}
                onClick={() => setActiveSection(item.id)}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {activeSection === item.id && (
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Section content */}
        <div className="flex-1 min-w-0">
          {/* ── Account ── */}
          {activeSection === "account" && (
            <AccountSection
              user={user}
              settings={settings}
              updateSetting={updateSetting}
              isSaved={saved === "account"}
              onSave={() => showSaved("account")}
              role={role}
            />
          )}

          {/* ── Appearance ── */}
          {activeSection === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how Learnova looks for you.</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingRow
                  label="Dark Mode"
                  description="Switch between light and dark interface."
                >
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-muted-foreground" />
                    <ToggleSwitch
                      checked={theme === "dark"}
                      onChange={handleThemeToggle}
                    />
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </SettingRow>
                <SettingRow
                  label="Compact Mode"
                  description="Reduce spacing for a denser layout."
                >
                  <ToggleSwitch
                    checked={settings.compactMode}
                    onChange={(v) => updateSetting("compactMode", v)}
                  />
                </SettingRow>
                <div className="pt-4 flex justify-end">
                  <Button size="sm" onClick={() => showSaved("appearance")} className="gap-2">
                    {saved === "appearance" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved === "appearance" ? "Saved!" : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Notifications ── */}
          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control which events notify you.</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingRow
                  label="File Upload Notifications"
                  description="Get notified when a teacher uploads new files."
                >
                  <ToggleSwitch
                    checked={settings.notifyFileUpload}
                    onChange={(v) => updateSetting("notifyFileUpload", v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Rating Notifications"
                  description="Get notified when a teacher rates your performance."
                >
                  <ToggleSwitch
                    checked={settings.notifyRating}
                    onChange={(v) => updateSetting("notifyRating", v)}
                  />
                </SettingRow>
                <SettingRow
                  label="AI Summary Completion"
                  description="Get notified when an AI summary or flashcard set is ready."
                >
                  <ToggleSwitch
                    checked={settings.notifyAISummary}
                    onChange={(v) => updateSetting("notifyAISummary", v)}
                  />
                </SettingRow>
                <div className="pt-4 flex justify-end">
                  <Button size="sm" onClick={() => showSaved("notifications")} className="gap-2">
                    {saved === "notifications" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved === "notifications" ? "Saved!" : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Learning Preferences (students) ── */}
          {activeSection === "learning" && role === "student" && (
            <Card>
              <CardHeader>
                <CardTitle>Learning Preferences</CardTitle>
                <CardDescription>Tailor your study experience.</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingRow
                  label="Auto-Save Notes"
                  description="Automatically save your notes as you type (1-second debounce)."
                >
                  <ToggleSwitch
                    checked={settings.autoSaveNotes}
                    onChange={(v) => updateSetting("autoSaveNotes", v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Flashcard Style"
                  description="Choose how your flashcard deck looks."
                >
                  <div className="flex gap-2">
                    {(["classic", "minimal", "colorful"] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => updateSetting("flashcardStyle", style)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                          settings.flashcardStyle === style
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <div className="pt-4 flex justify-end">
                  <Button size="sm" onClick={() => showSaved("learning")} className="gap-2">
                    {saved === "learning" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved === "learning" ? "Saved!" : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Teacher Preferences ── */}
          {activeSection === "teacher-prefs" && role === "teacher" && (
            <Card>
              <CardHeader>
                <CardTitle>Teacher Preferences</CardTitle>
                <CardDescription>Customize your teaching workflow.</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingRow
                  label="Rating Confirmation"
                  description="Show a confirmation dialog before submitting a student rating."
                >
                  <ToggleSwitch
                    checked={settings.ratingConfirmation}
                    onChange={(v) => updateSetting("ratingConfirmation", v)}
                  />
                </SettingRow>
                <SettingRow
                  label="Student Table Density"
                  description="Control how compact the students list appears."
                >
                  <div className="flex gap-2">
                    {(["comfortable", "compact"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => updateSetting("tableDensity", d)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                          settings.tableDensity === d
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <div className="pt-4 flex justify-end">
                  <Button size="sm" onClick={() => showSaved("teacher-prefs")} className="gap-2">
                    {saved === "teacher-prefs" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved === "teacher-prefs" ? "Saved!" : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Privacy & Security ── */}
          {activeSection === "privacy" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session Management</CardTitle>
                  <CardDescription>Manage your active login sessions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border">
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Logged in as <span className="font-medium">{user?.fullName}</span> · {role}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-500/30 bg-green-500/10">
                      Active
                    </Badge>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      logout();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out &amp; Clear Session
                  </Button>
                </CardContent>
              </Card>

              {role === "student" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5" /> Data &amp; Privacy
                    </CardTitle>
                    <CardDescription>Your data is stored securely and never shared.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        Passwords are hashed with bcrypt (cost factor 12).
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        Sessions use signed JWT tokens with a 7-day expiry.
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        Preferences are stored locally on this device only.
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        AI summaries are generated on-demand and never stored.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountSection({
  user,
  settings,
  updateSetting,
  isSaved,
  onSave,
  role,
}: {
  user: any;
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void;
  isSaved: boolean;
  onSave: () => void;
  role: string;
}) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(
    settings.displayNameOverride ?? user?.fullName ?? "",
  );
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleSaveProfile = () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    updateSetting("displayNameOverride", trimmed === user?.fullName ? null : trimmed);
    onSave();
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast({ title: "All password fields are required", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (newPwd.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setPwdLoading(true);
    try {
      const token = localStorage.getItem("learnova_auth_token");
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      toast({ title: "Password updated successfully" });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/40 border">
            <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold">
              {(settings.displayNameOverride ?? user?.fullName ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">
                {settings.displayNameOverride ?? user?.fullName}
              </p>
              <p className="text-sm text-muted-foreground capitalize">{role}</p>
              {role === "student" && user?.grade && (
                <p className="text-xs text-muted-foreground">Grade {user.grade}</p>
              )}
              {role === "teacher" && user?.subject && (
                <p className="text-xs text-muted-foreground">{user.subject}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              This overrides how your name appears in the app (local preference only).
            </p>
          </div>

          {role === "student" && user?.studentCode && (
            <div className="space-y-2">
              <Label>Student Code</Label>
              <Input value={user.studentCode} disabled className="h-11 opacity-60" />
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveProfile} className="gap-2">
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? "Saved!" : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {role === "student" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Change Password
            </CardTitle>
            <CardDescription>Keep your account secure with a strong password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPwd">Current Password</Label>
              <Input
                id="currentPwd"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPwd">New Password</Label>
              <Input
                id="newPwd"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 6 characters"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPwd">Confirm New Password</Label>
              <Input
                id="confirmPwd"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                className="h-11"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleChangePassword}
                disabled={pwdLoading}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                {pwdLoading ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {role === "teacher" && (
        <Card className="border-dashed">
          <CardContent className="p-6 flex items-start gap-3 text-muted-foreground">
            <Lock className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              Teacher credentials are managed by your school administrator. Subject passwords are set at the system level and cannot be changed from this portal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
