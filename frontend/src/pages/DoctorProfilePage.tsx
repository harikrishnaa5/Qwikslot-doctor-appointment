import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Pencil, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { DoctorAvatar } from "../components/DoctorAvatar";
import {
  Button,
  ModalBackdrop,
  ModalOverlay,
  ModalPanel,
  PageHeader,
} from "../components/ui";
import { DoctorProfileSkeleton } from "../components/skeletons";
import type { DoctorProfile } from "../api/doctor";
import { doctorGetMe, doctorUpdateProfile, doctorUploadPhoto } from "../api/doctor";
import { toast } from "../lib/toast";

const MAX_PHOTO_FILE_BYTES = 5 * 1024 * 1024;

function ProfileDetail({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="border-b border-slate-100 py-3.5 last:border-0 dark:border-slate-800">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function syncFormFromDoctor(
  d: DoctorProfile,
  setters: {
    setName: (v: string) => void;
    setEmail: (v: string) => void;
    setSpecialization: (v: string) => void;
    setExperience: (v: string) => void;
    setQualification: (v: string) => void;
  }
) {
  setters.setName(d.name);
  setters.setEmail(d.email ?? "");
  setters.setSpecialization(d.specialization ?? "");
  setters.setExperience(d.experience ?? "");
  setters.setQualification(d.qualification ?? "");
}

export function DoctorProfilePage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileQ = useQuery({ queryKey: ["doctor-me"], queryFn: doctorGetMe });

  const [photoOpen, setPhotoOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [qualification, setQualification] = useState("");

  const doctor = profileQ.data?.doctor;

  useEffect(() => {
    if (!doctor) return;
    syncFormFromDoctor(doctor, {
      setName,
      setEmail,
      setSpecialization,
      setExperience,
      setQualification,
    });
  }, [doctor]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["doctor-me"] });

  const updateProfile = useMutation({
    mutationFn: doctorUpdateProfile,
    onSuccess: () => {
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: () => {
      const body: Parameters<typeof doctorUpdateProfile>[0] = {
        name: name.trim(),
        specialization: specialization.trim() || undefined,
        experience: experience.trim() || undefined,
        qualification: qualification.trim() || undefined,
        email: email.trim() || undefined,
      };
      if (password.trim()) body.password = password;
      return doctorUpdateProfile(body);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setPassword("");
      setEditOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePhotoFile = async (file: File) => {
    if (file.size > MAX_PHOTO_FILE_BYTES) {
      toast.error(`Photo must be under ${MAX_PHOTO_FILE_BYTES / (1024 * 1024)} MB`);
      return;
    }
    try {
      const { imageUrl } = await doctorUploadPhoto(file);
      await updateProfile.mutateAsync({ imageUrl });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const removePhoto = async () => {
    try {
      await updateProfile.mutateAsync({ imageUrl: "" });
      toast.success("Profile photo removed");
      setPhotoOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove photo");
    }
  };

  const openEdit = () => {
    if (doctor) {
      syncFormFromDoctor(doctor, {
        setName,
        setEmail,
        setSpecialization,
        setExperience,
        setQualification,
      });
      setPassword("");
    }
    setEditOpen(true);
  };

  if (profileQ.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Profile" />
        <DoctorProfileSkeleton />
      </div>
    );
  }

  if (!doctor) return null;

  const hasPhoto = Boolean(doctor.imageUrl);

  return (
    <div className="flex flex-col gap-4 pb-4">
      <PageHeader
        title="Profile"
        right={
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 text-sm font-semibold text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-600 dark:bg-slate-900 dark:text-teal-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit profile
          </button>
        }
      />

      <section className="flex flex-col items-center px-2 pt-2 text-center">
        <button
          type="button"
          onClick={() => setPhotoOpen(true)}
          className="group relative rounded-full ring-4 ring-teal-500/15 transition hover:ring-teal-500/35 focus-visible:outline-none focus-visible:ring-teal-500/50 dark:ring-teal-500/25"
          aria-label="View profile photo"
        >
          <DoctorAvatar
            name={doctor.name}
            imageUrl={doctor.imageUrl}
            size="xl"
            shape="circle"
            className="shadow-lg shadow-slate-900/10 dark:shadow-black/30"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/0 transition group-hover:bg-slate-950/25">
            <Camera className="h-7 w-7 text-white opacity-0 transition group-hover:opacity-100" aria-hidden />
          </span>
        </button>

        <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{doctor.name}</h2>
        <p className="mt-1 text-sm text-teal-700 dark:text-teal-300">{doctor.department.name}</p>
        {doctor.email ? (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{doctor.email}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ProfileDetail label="Specialty" value={doctor.specialization ?? "—"} />
        <ProfileDetail label="Experience" value={doctor.experience ?? "—"} />
        <ProfileDetail label="Qualification" value={doctor.qualification ?? "—"} />
        {!doctor.specialization && !doctor.experience && !doctor.qualification ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Add your professional details with Edit profile.
          </p>
        ) : null}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          await handlePhotoFile(f);
        }}
      />

      {photoOpen && (
        <ModalOverlay>
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close profile photo"
            onClick={() => setPhotoOpen(false)}
          />
          <ModalBackdrop />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-photo-dialog-title"
            className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-1">
              <h3
                id="doctor-photo-dialog-title"
                className="text-lg font-semibold text-slate-900 dark:text-slate-50"
              >
                Profile photo
              </h3>
              <button
                type="button"
                onClick={() => setPhotoOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col items-center px-6 py-5">
              {hasPhoto ? (
                <img
                  src={doctor.imageUrl!}
                  alt=""
                  className="h-64 w-64 rounded-full object-cover ring-4 ring-teal-500/15 shadow-lg dark:ring-teal-500/25"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                  <DoctorAvatar name={doctor.name} imageUrl={null} size="2xl" shape="circle" />
                  <p className="text-sm">No photo yet</p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-row items-center justify-center gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                disabled={updateProfile.isPending}
                onClick={() => fileInputRef.current?.click()}
                aria-label={hasPhoto ? "Change photo" : "Add photo"}
                className={clsx(
                  "inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-700 active:scale-[0.98] disabled:opacity-45 dark:bg-teal-500 dark:hover:bg-teal-400"
                )}
              >
                <Camera className="h-5 w-5" aria-hidden />
              </button>
              {hasPhoto ? (
                <button
                  type="button"
                  disabled={updateProfile.isPending}
                  onClick={() => void removePhoto()}
                  aria-label="Remove photo"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-900/20 transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-45 dark:bg-rose-600 dark:hover:bg-rose-500"
                >
                  <Trash2 className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </ModalOverlay>
      )}

      {editOpen && (
        <ModalOverlay>
          <ModalBackdrop />
          <ModalPanel
            title="Edit profile"
            maxWidth="max-w-lg"
            footer={
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setPassword("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="doctor-edit-form"
                  disabled={!name.trim() || !email.trim() || saveEdit.isPending}
                >
                  {saveEdit.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            }
          >
            <form
              id="doctor-edit-form"
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveEdit.mutate();
              }}
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tap your photo above to change or remove it.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Department
                </label>
                <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                  {doctor.department.name}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Login email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  New password (optional)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Specialty</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Experience</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Qualification</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  rows={3}
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                />
              </div>
            </form>
          </ModalPanel>
        </ModalOverlay>
      )}
    </div>
  );
}
