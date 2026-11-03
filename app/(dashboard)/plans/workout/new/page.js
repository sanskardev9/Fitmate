import PageHeader from "@/components/common/PageHeader";
import WorkoutPlanBuilder from "@/components/workout/WorkoutPlanBuilder";

export const metadata = { title: "New workout plan" };

export default function NewWorkoutPlanPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <WorkoutPlanBuilder header={<PageHeader title="Create your workout" subtitle="Workout plan" />} />
    </div>
  );
}
