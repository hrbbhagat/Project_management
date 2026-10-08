import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectService, taskService } from "@/services";
import { ApiError } from "@/services/api";
import { PROJECT_STATUSES, TASK_PRIORITIES, TASK_STATUSES, labelize, toDateInput } from "@/lib/constants";
import type { Project, Task } from "@/types";

const selectCls =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[] | readonly string[];
  placeholder?: string;
}) {
  return (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? labelize(o) : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

function clean<T extends Record<string, unknown>>(o: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) out[k] = v === "" ? null : v;
  return out;
}

export function ProjectDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (o: boolean) => void; project?: Project }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", description: "", status: "", start_date: "", due_date: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open)
      setF({
        name: project?.name ?? "",
        description: project?.description ?? "",
        status: project?.status ?? PROJECT_STATUSES[0],
        start_date: toDateInput(project?.start_date),
        due_date: toDateInput(project?.due_date),
      });
    setErrors({});
  }, [open, project]);

  const m = useMutation({
    mutationFn: () => {
      const body = clean(f) as Partial<Project>;
      return project ? projectService.update(project.id, body) : projectService.create(body);
    },
    onSuccess: () => {
      toast.success(project ? "Project updated" : "Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
      toast.error((e as Error).message);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Project name is required";
    if (f.start_date && f.due_date && f.due_date < f.start_date) errs.due_date = "Due date must be after start date";
    setErrors(errs);
    if (!Object.keys(errs).length) m.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Project name" error={errors.name}>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          </Field>
          <Field label="Description" error={errors.description}>
            <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <Field label="Status" error={errors.status}>
            <NativeSelect value={f.status} onChange={(v) => setF({ ...f, status: v })} options={PROJECT_STATUSES} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" error={errors.start_date}>
              <Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
            </Field>
            <Field label="Due date" error={errors.due_date}>
              <Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending && <Loader2 className="size-4 animate-spin" />}
              {project ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  projects,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task;
  projects: Project[];
  defaultProjectId?: string;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", description: "", status: "", priority: "", due_date: "", project_id: "", assigned_to: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open)
      setF({
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? TASK_STATUSES[0],
        priority: task?.priority ?? TASK_PRIORITIES[1],
        due_date: toDateInput(task?.due_date),
        project_id: String(task?.project_id ?? defaultProjectId ?? ""),
        assigned_to: task?.assigned_to != null ? String(task.assigned_to) : "",
      });
    setErrors({});
  }, [open, task, defaultProjectId]);

  const m = useMutation({
    mutationFn: () => {
      const body = clean({
        ...f,
        project_id: f.project_id ? (isNaN(Number(f.project_id)) ? f.project_id : Number(f.project_id)) : "",
        assigned_to: f.assigned_to ? (isNaN(Number(f.assigned_to)) ? f.assigned_to : Number(f.assigned_to)) : "",
      }) as Partial<Task>;
      return task ? taskService.update(task.id, body) : taskService.create(body);
    },
    onSuccess: () => {
      toast.success(task ? "Task updated" : "Task created");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors);
      toast.error((e as Error).message);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.title.trim()) errs.title = "Task title is required";
    if (!f.project_id) errs.project_id = "Select a project";
    setErrors(errs);
    if (!Object.keys(errs).length) m.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Task title" error={errors.title}>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus />
          </Field>
          <Field label="Description" error={errors.description}>
            <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <Field label="Project" error={errors.project_id}>
            <NativeSelect
              value={f.project_id}
              onChange={(v) => setF({ ...f, project_id: v })}
              placeholder="Select project"
              options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" error={errors.status}>
              <NativeSelect value={f.status} onChange={(v) => setF({ ...f, status: v })} options={TASK_STATUSES} />
            </Field>
            <Field label="Priority" error={errors.priority}>
              <NativeSelect value={f.priority} onChange={(v) => setF({ ...f, priority: v })} options={TASK_PRIORITIES} />
            </Field>
            <Field label="Due date" error={errors.due_date}>
              <Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
            </Field>
            <Field label="Assigned user ID" error={errors.assigned_to}>
              <Input value={f.assigned_to} placeholder="Optional" onChange={(e) => setF({ ...f, assigned_to: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending && <Loader2 className="size-4 animate-spin" />}
              {task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDelete({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />} Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
