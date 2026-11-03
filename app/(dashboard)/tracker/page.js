import { redirect } from "next/navigation";

// The tracker was split into Home, Workout, Diet and Progress.
export default function TrackerPage() {
  redirect("/home");
}
