// Hand-written to match supabase/migrations/0001_init.sql.
// Once the project is linked, regenerate with the Supabase CLI/MCP
// (`generate_typescript_types`) and this file can be replaced wholesale.

export type TaskCategory =
  | "feeding"
  | "sleep"
  | "diapers"
  | "tummy_time"
  | "bath"
  | "medicine";

export type TaskStatus = "done" | "due" | "overdue";
export type TaskRecurrenceType = "interval" | "weekly";

// `type` (not `interface`) so these structurally satisfy supabase-js's
// `Record<string, unknown>` generic constraints — interfaces don't get
// TypeScript's implicit index signature the way object-literal types do.
export type Household = {
  id: string;
  name: string;
  reset_time: string; // "HH:MM:SS"
  timezone: string;
  invite_code: string;
  created_at: string;
};

export type Parent = {
  id: string;
  household_id: string;
  name: string;
  auth_user_id: string;
  notify_overdue: boolean;
  notify_partner_logged: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
};

export type TaskTemplate = {
  id: string;
  household_id: string;
  category: TaskCategory;
  name: string;
  recurrence_type: TaskRecurrenceType;
  interval_hours: number | null;
  weekly_days: number[] | null; // ISO weekday numbers, 1=Mon..7=Sun
  is_active: boolean;
  created_at: string;
};

export type Task = {
  id: string;
  household_id: string;
  template_id: string | null;
  category: TaskCategory;
  name: string;
  recurrence_type: TaskRecurrenceType; // denormalized from the template at occurrence-creation time
  due_at: string; // timestamptz — the concrete next-due instant
  status: TaskStatus;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  task_id: string;
  parent_id: string;
  text: string;
  created_at: string;
};

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      households: Table<Household, Omit<Household, "invite_code" | "created_at"> & Partial<Pick<Household, "id" | "reset_time" | "timezone">>>;
      parents: Table<Parent, Omit<Parent, "id" | "created_at" | "notify_overdue" | "notify_partner_logged" | "quiet_hours_start" | "quiet_hours_end"> & Partial<Pick<Parent, "notify_overdue" | "notify_partner_logged">>>;
      task_templates: Table<TaskTemplate, Omit<TaskTemplate, "id" | "created_at" | "is_active"> & Partial<Pick<TaskTemplate, "is_active">>>;
      tasks: Table<Task, Omit<Task, "id" | "created_at" | "status" | "completed_by" | "completed_at" | "template_id"> & Partial<Pick<Task, "status" | "completed_by" | "completed_at" | "template_id">>>;
      notes: Table<Note, Omit<Note, "id" | "created_at">>;
    };
    Views: Record<string, never>;
    Functions: {
      household_by_invite_code: {
        Args: { p_code: string };
        Returns: { id: string; name: string }[];
      };
      resync_household_tasks: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
  };
}
