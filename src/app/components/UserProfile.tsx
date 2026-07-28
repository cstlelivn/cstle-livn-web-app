import { useState } from "react";
import { User, Mail, Phone, MapPin, Camera, Save, Lock, Shield, Bell, Eye, EyeOff } from "lucide-react";
import { usePermissions } from "./PermissionContext";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar } from "./ui/avatar";
import { toast } from "sonner";

export default function UserProfile() {
  const { currentUser, hasPermission } = usePermissions();
  const isAdmin = currentUser?.role === "Admin";

  const [profileData, setProfileData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: "(555) 123-4567",
    location: "New York, NY",
    bio: "Passionate about delivering excellence in finishing and construction.",
    avatar: "",
    // Preferences
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    projectUpdates: true,
    theme: "light",
    language: "en",
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully");
  };

  const handleChangePassword = () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    toast.success("Password changed successfully");
    setSecurityData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, avatar: reader.result as string });
        toast.success("Profile photo updated");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-[24px] w-full p-[32px]">
      {/* Header */}
      <div>
        <h1 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
          Profile Settings
        </h1>
        <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground mt-[4px]">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
        {/* Profile Card */}
        <div className="bg-card border border-border rounded-[20px] p-[24px]">
          <div className="flex flex-col items-center">
            <div className="relative mb-[16px]">
              <div className="w-[120px] h-[120px] rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                {profileData.avatar ? (
                  <img src={profileData.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-[8px] bg-accent text-accent-foreground rounded-full cursor-pointer hover:opacity-90 transition-opacity"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <h3 className="font-['Roboto_Mono'] font-bold text-[13px] text-foreground mb-[4px]">
              {profileData.name}
            </h3>
            <p className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground mb-[8px]">
              {currentUser?.role}
            </p>
            <div className="flex items-center gap-[8px] mb-[16px]">
              <Shield className="w-3 h-3 text-accent" />
              <p className="font-['Roboto_Mono'] font-medium text-[9px] text-accent">
                Verified Account
              </p>
            </div>
            <div className="w-full space-y-[8px]">
              <div className="flex items-center gap-[8px] p-[8px] bg-background rounded-[6px]">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <p className="font-['Roboto_Mono'] font-normal text-[9px] text-foreground">
                  {profileData.email}
                </p>
              </div>
              <div className="flex items-center gap-[8px] p-[8px] bg-background rounded-[6px]">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <p className="font-['Roboto_Mono'] font-normal text-[9px] text-foreground">
                  {profileData.phone}
                </p>
              </div>
              <div className="flex items-center gap-[8px] p-[8px] bg-background rounded-[6px]">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <p className="font-['Roboto_Mono'] font-normal text-[9px] text-foreground">
                  {profileData.location}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-[24px]">
              <TabsTrigger value="general" className="font-['Roboto_Mono'] text-[10px]">
                General
              </TabsTrigger>
              <TabsTrigger value="preferences" className="font-['Roboto_Mono'] text-[10px]">
                Preferences
              </TabsTrigger>
              <TabsTrigger value="security" className="font-['Roboto_Mono'] text-[10px]">
                Security
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general">
              <div className="bg-card border border-border rounded-[20px] p-[24px]">
                <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[16px]">
                  Personal Information
                </h3>
                <div className="space-y-[16px]">
                  <div>
                    <Label htmlFor="name" className="text-[10px]">
                      Full Name {!isAdmin && <Lock className="w-3 h-3 inline ml-1 text-muted-foreground" />}
                    </Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={!isAdmin}
                      className="mt-[8px] text-[11px]"
                      placeholder="Enter your full name"
                    />
                    {!isAdmin && (
                      <p className="font-['Roboto_Mono'] font-normal text-[8px] text-muted-foreground mt-[4px]">
                        Contact admin to change your name
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-[10px]">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="mt-[8px] text-[11px]"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-[10px]">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="mt-[8px] text-[11px]"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location" className="text-[10px]">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="mt-[8px] text-[11px]"
                      placeholder="City, State"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-[10px]">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      className="mt-[8px] text-[11px]"
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="w-full px-[16px] py-[10px] bg-accent text-accent-foreground rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[11px] flex items-center justify-center gap-[8px]"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <div className="bg-card border border-border rounded-[20px] p-[24px]">
                <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[16px]">
                  Notification Preferences
                </h3>
                <div className="space-y-[16px]">
                  <div className="flex items-center justify-between p-[12px] bg-background rounded-[8px]">
                    <div>
                      <p className="font-['Roboto_Mono'] font-medium text-[10px] text-foreground mb-[2px]">
                        Email Notifications
                      </p>
                      <p className="font-['Roboto_Mono'] font-normal text-[8px] text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                    <Switch
                      checked={profileData.emailNotifications}
                      onCheckedChange={(checked) =>
                        setProfileData({ ...profileData, emailNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-[12px] bg-background rounded-[8px]">
                    <div>
                      <p className="font-['Roboto_Mono'] font-medium text-[10px] text-foreground mb-[2px]">
                        Push Notifications
                      </p>
                      <p className="font-['Roboto_Mono'] font-normal text-[8px] text-muted-foreground">
                        Receive push notifications
                      </p>
                    </div>
                    <Switch
                      checked={profileData.pushNotifications}
                      onCheckedChange={(checked) =>
                        setProfileData({ ...profileData, pushNotifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-[12px] bg-background rounded-[8px]">
                    <div>
                      <p className="font-['Roboto_Mono'] font-medium text-[10px] text-foreground mb-[2px]">
                        Weekly Reports
                      </p>
                      <p className="font-['Roboto_Mono'] font-normal text-[8px] text-muted-foreground">
                        Get weekly performance summaries
                      </p>
                    </div>
                    <Switch
                      checked={profileData.weeklyReports}
                      onCheckedChange={(checked) =>
                        setProfileData({ ...profileData, weeklyReports: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-[12px] bg-background rounded-[8px]">
                    <div>
                      <p className="font-['Roboto_Mono'] font-medium text-[10px] text-foreground mb-[2px]">
                        Project Updates
                      </p>
                      <p className="font-['Roboto_Mono'] font-normal text-[8px] text-muted-foreground">
                        Get notified about project changes
                      </p>
                    </div>
                    <Switch
                      checked={profileData.projectUpdates}
                      onCheckedChange={(checked) =>
                        setProfileData({ ...profileData, projectUpdates: checked })
                      }
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="w-full px-[16px] py-[10px] bg-accent text-accent-foreground rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[11px] flex items-center justify-center gap-[8px]"
                  >
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <div className="bg-card border border-border rounded-[20px] p-[24px]">
                <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[16px]">
                  Change Password
                </h3>
                <div className="space-y-[16px]">
                  <div>
                    <Label htmlFor="current-password" className="text-[10px]">
                      Current Password
                    </Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) =>
                        setSecurityData({ ...securityData, currentPassword: e.target.value })
                      }
                      className="mt-[8px] text-[11px]"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-password" className="text-[10px]">
                      New Password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) =>
                        setSecurityData({ ...securityData, newPassword: e.target.value })
                      }
                      className="mt-[8px] text-[11px]"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="text-[10px]">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) =>
                        setSecurityData({ ...securityData, confirmPassword: e.target.value })
                      }
                      className="mt-[8px] text-[11px]"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    className="w-full px-[16px] py-[10px] bg-accent text-accent-foreground rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[11px] flex items-center justify-center gap-[8px]"
                  >
                    <Lock className="w-4 h-4" />
                    Change Password
                  </button>

                  <div className="mt-[24px] pt-[24px] border-t border-border">
                    <h4 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground mb-[12px]">
                      Two-Factor Authentication
                    </h4>
                    <p className="font-['Roboto_Mono'] font-normal text-[9px] text-muted-foreground mb-[12px]">
                      Add an extra layer of security to your account
                    </p>
                    <button className="px-[16px] py-[10px] bg-background border border-border rounded-[6px] hover:bg-secondary transition-colors font-['Roboto_Mono'] font-medium text-[10px]">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
