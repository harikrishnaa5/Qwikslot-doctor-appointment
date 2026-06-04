import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { fetchDepartments, fetchDoctors } from "../api/public";
import { Card, PageHeader } from "../components/ui";
import { DoctorListSkeleton } from "../components/skeletons";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { departmentNameToSlug } from "../lib/departmentSlug";
import { setSelectedDoctorId } from "../lib/selectedDoctor";

export function DepartmentDoctorsPage() {
  const { deptSlug } = useParams<{ deptSlug: string }>();
  const deptQ = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const resolvedDeptId = deptQ.data?.find((d) => departmentNameToSlug(d.name) === deptSlug)?.id ?? deptSlug;
  const q = useQuery({
    queryKey: ["doctors", resolvedDeptId],
    queryFn: () => fetchDoctors(resolvedDeptId),
    enabled: Boolean(resolvedDeptId),
  });

  return (
    <div>
      <PageHeader title="Doctors" />
      {q.isLoading ? (
        <DoctorListSkeleton count={3} />
      ) : (
        <ul className="flex flex-col gap-3">
          {q.data?.map((doc) => (
            <li key={doc.id}>
              <Link
                to="/doctors"
                className="block"
                onClick={() => {
                  setSelectedDoctorId(doc.id);
                }}
              >
                <Card className="flex gap-4 transition hover:border-teal-400/50 hover:shadow-md dark:hover:border-teal-600/40">
                  <DoctorAvatar name={doc.name} imageUrl={doc.imageUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{doc.name}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{doc.specialization ?? "General"}</p>
                    <p className="mt-3 text-sm font-medium text-teal-700 dark:text-teal-400">View availability →</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
