"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, KeyRound, Save, RefreshCcw, CheckCircle2, User, Mail, Shield, LogIn } from "lucide-react";
import { useOrderStore } from "@/lib/store";
import { useRouter } from "next/navigation";

type ProfileData = {
  id: string;
  username: string;
  email?: string;
  role: string;
  authProvider: string;
  avatar?: string | null;
  hasPassword?: boolean;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  manager: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  waiter: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
};

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useOrderStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Avatar
  const [avatar, setAvatar] = useState<string | null | undefined>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);

  // Password section
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Username
  const [newUsername, setNewUsername] = useState("");

  // Saving states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/users/me");
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (res.ok) {
          const data: ProfileData = await res.json();
          setProfile(data);
          setAvatar(data.avatar);
          setNewUsername(data.username);
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512000) {
      setProfileError("Please choose an image under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
      setAvatarChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const payload: Record<string, unknown> = {};
      if (newUsername && newUsername !== profile?.username) {
        payload.username = newUsername;
      }
      if (avatarChanged) {
        payload.avatar = avatar;
      }

      if (Object.keys(payload).length === 0) {
        setProfileError("No changes to save.");
        setIsSavingProfile(false);
        return;
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, username: data.username, avatar: data.avatar } : prev);
        setCurrentUser({ id: data.id, username: data.username, email: data.email, role: data.role, avatar: data.avatar });
        localStorage.setItem("userSession", JSON.stringify({ id: data.id, username: data.username, email: data.email, role: data.role }));
        setAvatarChanged(false);
        setProfileSuccess("Profile updated successfully!");
        setTimeout(() => setProfileSuccess(""), 3000);
      } else {
        setProfileError(data.error || "Failed to update profile.");
      }
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError("Password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    // Google-only users don't need currentPassword; local users do
    const isGoogleOnly = profile?.authProvider === "google" && !profile?.hasPassword;

    setIsSavingPassword(true);
    try {
      const payload: Record<string, string> = { password: newPassword };
      if (!isGoogleOnly) {
        if (!currentPassword) {
          setPasswordError("Current password is required.");
          setIsSavingPassword(false);
          return;
        }
        payload.currentPassword = currentPassword;
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Refresh profile to reflect authProvider change
        setProfile(prev => prev ? { ...prev, authProvider: "local" } : prev);
        setTimeout(() => setPasswordSuccess(""), 3000);
      } else {
        setPasswordError(data.error || "Failed to update password.");
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const isGoogleOnly = profile.authProvider === "google" && !profile.hasPassword;
  const initials = profile.username.charAt(0).toUpperCase();
  const roleColor = ROLE_COLORS[profile.role] || "bg-secondary text-foreground border-border";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details, photo, and security settings.</p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Header gradient band */}
        <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />

        <div className="px-6 pb-6 -mt-12">
          {/* Avatar */}
          <div className="flex items-end justify-between mb-6">
            <div className="relative">
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl border-4 border-card bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center text-white text-3xl font-bold shadow-xl cursor-pointer overflow-hidden group"
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                  <Camera className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-lg border-2 border-card cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}>
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full border capitalize ${roleColor}`}>
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              {profile.role}
            </span>
          </div>

          {/* Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-semibold text-foreground">{profile.username}</p>
              </div>
            </div>
            {profile.email && (
              <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground truncate">{profile.email}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
              <LogIn className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Sign-in Method</p>
                <p className="font-semibold text-foreground capitalize">{profile.authProvider === "google" ? "Google" : "Password"}</p>
              </div>
            </div>
          </div>

          {/* Edit Username & Avatar */}
          <div className="border-t border-border pt-5 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Edit Display Name
            </h3>

            {profileError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 font-semibold">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-sm text-green-500 bg-green-500/10 rounded-xl px-4 py-3 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />{profileSuccess}
              </p>
            )}

            <input
              type="text"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="w-full bg-secondary/50 border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground placeholder:text-muted-foreground"
              placeholder="Enter new username"
            />

            <p className="text-xs text-muted-foreground">
              {avatarChanged ? "✓ New photo selected — click Save Profile to apply." : "Click your photo above to change it."}
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-60 transition-all"
            >
              {isSavingProfile ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSavingProfile ? "Saving…" : "Save Profile"}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Password / Security Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">
              {isGoogleOnly ? "Set a Password" : "Change Password"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isGoogleOnly
                ? "You signed in with Google. You can optionally set a password to also allow credential login."
                : "Update your password. You must enter your current password to confirm."}
            </p>
          </div>
        </div>

        {passwordError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 font-semibold mb-4">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="text-sm text-green-500 bg-green-500/10 rounded-xl px-4 py-3 font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />{passwordSuccess}
          </p>
        )}

        <div className="space-y-4">
          {/* Current password — only for non-Google-only users */}
          {!isGoogleOnly && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground ml-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full bg-secondary/50 border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">
              {isGoogleOnly ? "New Password" : "New Password"}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 4 characters"
              className="w-full bg-secondary/50 border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="w-full bg-secondary/50 border border-border px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSavePassword}
            disabled={isSavingPassword}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-60 transition-all"
          >
            {isSavingPassword ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {isSavingPassword ? "Saving…" : isGoogleOnly ? "Set Password" : "Update Password"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
