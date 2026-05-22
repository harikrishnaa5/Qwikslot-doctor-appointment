import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { Card, Button, PageHeader, Skeleton } from "../components/ui";
import { doctorGetMe, doctorUpdateProfile, doctorUploadPhoto } from "../api/doctor";
import { toast } from "../lib/toast";

const MAX_PHOTO_FILE_BYTES = 5 * 1024 * 1024;

export function DoctorProfilePage() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ["doctor-me"], queryFn: doctorGetMe });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [qualification, setQualification] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const d = profileQ.data?.doctor;
    if (!d) return;
    setName(d.name);
    setEmail(d.email ?? "");
    setPassword("");
    setSpecialization(d.specialization ?? "");
    setExperience(d.experience ?? "");
    setQualification(d.qualification ?? "");
    setImageUrl(d.imageUrl ?? "");
  }, [profileQ.data?.doctor]);

  const save = useMutation({
    mutationFn: () => {
      const body: Parameters<typeof doctorUpdateProfile>[0] = {
        name: name.trim(),
        specialization: specialization.trim() || undefined,
        experience: experience.trim() || undefined,
        qualification: qualification.trim() || undefined,
        imageUrl: imageUrl.trim() ? imageUrl : "",
        email: email.trim() || undefined,
      };
      if (password.trim()) body.password = password;
      return doctorUpdateProfile(body);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["doctor-me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doctor = profileQ.data?.doctor;

  if (profileQ.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Profile" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Profile" />
      <p className="-mt-2 text-sm text-slate-600 dark:text-slate-400">
        Update your professional details and login.
      </p>

      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <DoctorAvatar name={name || "Doctor"} imageUrl={imageUrl || null} size="lg" />
            <div className="w-full flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Profile photo (max {MAX_PHOTO_FILE_BYTES / (1024 * 1024)} MB)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-teal-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white dark:text-slate-400 dark:file:bg-teal-500"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (f.size > MAX_PHOTO_FILE_BYTES) {
                    toast.error(`Photo must be under ${MAX_PHOTO_FILE_BYTES / (1024 * 1024)} MB`);
                    return;
                  }
                  try {
                    const { imageUrl: url } = await doctorUploadPhoto(f);
                    setImageUrl(url);
                    toast.success("Photo uploaded");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Upload failed");
                  }
                }}
              />
              {imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 min-h-10 text-xs"
                  onClick={() => setImageUrl("")}
                >
                  Clear photo
                </Button>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400"
              value={doctor?.department.name ?? ""}
              disabled
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Contact admin to change department.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Login email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              New password (optional)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Leave blank to keep current password"
              className="w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Primary specialty</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Experience</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Qualification</label>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              rows={3}
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={!name.trim() || !email.trim() || save.isPending} className="w-full sm:w-auto">
            {save.isPending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
