import { useGreetingAndWeather } from "@/hooks/useGreetingAndWeather";
import ActivityLogs from "./ActivityLogs";

const Activity = () => {
  const { greeting, emoji } = useGreetingAndWeather();

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {greeting} {emoji}
        </h1>
        <p className="text-muted-foreground">
          Communication history and logs
        </p>
      </div>

      {/* Activity Logs with Search and Filters */}
      <ActivityLogs />
    </div>
  );
};

export default Activity;
